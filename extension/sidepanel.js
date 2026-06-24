const API_BASE = (window.WCWP_CONFIG && window.WCWP_CONFIG.API_BASE || "https://worldcupwatchplace-api.onrender.com").replace(/\/$/, "");

const state = {
  filter: "all",
  selectedMatch: "m1",
  context: null,
  feedback: {},
  watchList: {},
  expandedWatchItem: "",
  sortMode: "recommended",
  category: "all",
  insightsUnlocked: false,
  matches: window.WCWP_DATA.matches,
  venues: window.WCWP_DATA.venues,
  dataMode: "mock",
  liveMatch: null,
  locationMode: "manual",
  coords: null,
  locationLabel: "San Francisco, CA",
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles",
  isLoading: false
};

const STATUS_LABELS = {
  confirmed: "Confirmed",
  likely: "Likely",
  needs_check: "Check first"
};

const els = {
  contextText: document.getElementById("contextText"),
  dataText: document.getElementById("dataText"),
  refreshContext: document.getElementById("refreshContext"),
  refreshData: document.getElementById("refreshData"),
  matchSelect: document.getElementById("matchSelect"),
  sortSelect: document.getElementById("sortSelect"),
  categorySelect: document.getElementById("categorySelect"),
  locationInput: document.getElementById("locationInput"),
  nearbyButton: document.getElementById("nearbyButton"),
  searchLocation: document.getElementById("searchLocation"),
  locationNote: document.getElementById("locationNote"),
  venueList: document.getElementById("venueList"),
  resultCount: document.getElementById("resultCount"),
  confirmedCount: document.getElementById("confirmedCount"),
  passStatus: document.getElementById("passStatus"),
  insightsPanel: document.getElementById("insightsPanel"),
  watchListPanel: document.getElementById("watchListPanel"),
  watchListItems: document.getElementById("watchListItems"),
  clearWatchList: document.getElementById("clearWatchList"),
  callModal: document.getElementById("callModal"),
  closeCallModal: document.getElementById("closeCallModal"),
  callVenueName: document.getElementById("callVenueName"),
  callPhoneNumber: document.getElementById("callPhoneNumber"),
  copyPhone: document.getElementById("copyPhone"),
  phoneAppLink: document.getElementById("phoneAppLink"),
  calledVenue: document.getElementById("calledVenue")
};

function storageGet(keys) {
  if (!globalThis.chrome || !chrome.storage) {
    const raw = localStorage.getItem("wcwp_state");
    return Promise.resolve(raw ? JSON.parse(raw) : {});
  }
  return chrome.storage.local.get(keys);
}

function storageSet(value) {
  if (!globalThis.chrome || !chrome.storage) {
    const raw = localStorage.getItem("wcwp_state");
    const current = raw ? JSON.parse(raw) : {};
    localStorage.setItem("wcwp_state", JSON.stringify({ ...current, ...value }));
    return Promise.resolve();
  }
  return chrome.storage.local.set(value);
}

async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`);
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `API request failed: ${response.status}`);
  }
  return data;
}

async function apiPost(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `API request failed: ${response.status}`);
  }
  return data;
}

async function loadState() {
  const saved = await storageGet([
    "feedback",
    "watchList",
    "insightsUnlocked",
    "selectedMatch",
    "sortMode",
    "category",
    "location",
    "locationMode",
    "coords",
    "locationLabel"
  ]);
  state.feedback = saved.feedback || {};
  state.watchList = saved.watchList || {};
  state.insightsUnlocked = Boolean(saved.insightsUnlocked);
  state.selectedMatch = saved.selectedMatch || state.selectedMatch;
  state.sortMode = saved.sortMode || state.sortMode;
  state.category = saved.category || state.category;
  state.locationMode = saved.locationMode || state.locationMode;
  state.coords = saved.coords || null;
  state.locationLabel = saved.locationLabel || saved.location || state.locationLabel;
  els.locationInput.value = saved.location || state.locationLabel;
  els.sortSelect.value = state.sortMode;
  els.categorySelect.value = state.category;
}

function setDataText(text) {
  els.dataText.textContent = text;
}

function updateLocationNote(location) {
  const timeZone = location && location.timeZone ? location.timeZone : state.timeZone;
  const label = location && location.label ? location.label : (els.locationInput.value || state.locationLabel);
  if (state.locationMode === "nearby" && state.coords) {
    els.locationNote.textContent = `Search area: nearby - times in ${timeZone} - driving distance`;
    els.nearbyButton.classList.add("active");
  } else {
    els.locationNote.textContent = `Search area: ${label} - times in ${timeZone} - driving distance`;
    els.nearbyButton.classList.remove("active");
  }
}

function renderMatches() {
  els.matchSelect.innerHTML = "";
  state.matches.forEach((match) => {
    const option = document.createElement("option");
    option.value = match.id;
    const ground = match.ground ? ` - ${match.ground}` : "";
    option.textContent = `${match.label} - ${match.kickoff}${ground}`;
    els.matchSelect.append(option);
  });
  if (!state.matches.some((match) => match.id === state.selectedMatch)) {
    state.selectedMatch = state.matches[0] && state.matches[0].id;
  }
  els.matchSelect.value = state.selectedMatch;
}

function filteredVenues() {
  return state.venues.filter((venue) => {
    if (state.filter === "confirmed") return venue.status === "confirmed";
    if (state.filter === "reservable") return venue.reservable || /reserv/i.test(venue.reservationStatus || "");
    if (state.filter === "open") return /open now/i.test(venue.open || "");
    return true;
  });
}

function feedbackKey(venueId) {
  return `${state.selectedMatch}:${venueId}`;
}

function planKey(venueId) {
  return `${state.selectedMatch}:${venueId}`;
}

function safeText(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function actionLink(href, label, className = "") {
  const disabled = !href || href === "#";
  const classes = [className, disabled ? "disabled" : ""].filter(Boolean).join(" ");
  return `<a class="${classes}" href="${disabled ? "#" : href}" target="${href && href.startsWith("http") ? "_blank" : ""}" rel="noreferrer">${label}</a>`;
}

function actionButton(label, dataAttr, disabled = false) {
  return `<button type="button" ${dataAttr} class="${disabled ? "disabled" : ""}" ${disabled ? "disabled" : ""}>${label}</button>`;
}

function renderVenue(venue) {
  const key = feedbackKey(venue.id);
  const selectedFeedback = state.feedback[key];
  const currentPlan = state.watchList[planKey(venue.id)];
  const reserveLabel = "Website/Reserve";
  const ratingText = venue.rating ? `${venue.rating.toFixed(1)} (${venue.userRatingCount || 0})` : "No rating";
  const matchText = venue.confirmationLabel || "Call to confirm";
  const travelPrefix = venue.travelMode === "driving" ? "Drive" : "Distance";
  const travelText = `${travelPrefix}: ${venue.distance || "Unknown"}${venue.eta ? ` - ${venue.eta}` : ""}`;
  const card = document.createElement("article");
  card.className = "venue-card";
  card.innerHTML = `
    <div class="venue-head">
      <div class="venue-title">
        <h3>${safeText(venue.name)}</h3>
        <span class="meta">${safeText(venue.type)} - ${safeText(venue.area)}</span>
        <span class="meta travel-meta">${safeText(travelText)}</span>
      </div>
      <span class="status ${venue.status}">${STATUS_LABELS[venue.status]}</span>
    </div>
    <div class="badges">
      ${venue.badges.map((badge) => `<span class="badge">${safeText(badge)}</span>`).join("")}
    </div>
    <dl class="venue-facts">
      <div><dt>Reserve</dt><dd>${safeText(venue.reservationStatus || "Unknown")}</dd></div>
      <div><dt>Rating</dt><dd>${safeText(ratingText)}</dd></div>
      <div><dt>Match</dt><dd>${safeText(matchText)}</dd></div>
      <div><dt>Price</dt><dd>${safeText(venue.price)}</dd></div>
    </dl>
    <p class="reason">${safeText(venue.reason)}</p>
    ${venue.socialSources && venue.socialSources.length ? `<p class="social-sources">Signals: ${safeText(venue.socialSources.join(", "))}</p>` : ""}
    <div class="confidence">
      <span>${venue.confidence}% fit</span>
      <div class="bar"><span style="width: ${venue.confidence}%"></span></div>
    </div>
    <p class="meta">${safeText(venue.open)}</p>
    <div class="actions">
      ${actionLink(venue.mapsUrl, "Map", "primary")}
      ${actionLink(venue.website, reserveLabel)}
      ${actionButton("Call", `data-call="${safeText(venue.id)}"`, !venue.phone)}
    </div>
    <div class="plan-row">
      <button data-plan="will_go" data-venue="${safeText(venue.id)}" class="${currentPlan ? "active" : ""}">${currentPlan ? "In my list" : "Will go"}</button>
      ${currentPlan ? `<button data-plan="already_there" data-venue="${safeText(venue.id)}" class="${currentPlan.status === "already_there" ? "active" : ""}">Already there</button>` : `<button data-plan="will_go" data-venue="${safeText(venue.id)}">Add to list</button>`}
    </div>
    ${currentPlan && /already_there|called/.test(currentPlan.status) ? `
      <div class="verify-row">
        <button data-feedback="confirmed" data-venue="${safeText(venue.id)}" class="${selectedFeedback === "confirmed" ? "active" : ""}">Right place</button>
        <button data-feedback="not_showing" data-venue="${safeText(venue.id)}" class="${selectedFeedback === "not_showing" ? "active" : ""}">Not showing</button>
        <button data-feedback="packed" data-venue="${safeText(venue.id)}" class="${selectedFeedback === "packed" ? "active" : ""}">Too crowded</button>
        <button data-feedback="reservable" data-venue="${safeText(venue.id)}" class="${selectedFeedback === "reservable" ? "active" : ""}">Can reserve</button>
      </div>
    ` : ""}
  `;

  card.querySelectorAll("[data-feedback]").forEach((button) => {
    button.addEventListener("click", () => saveFeedback(button.dataset.venue || venue.id, button.dataset.feedback));
  });

  card.querySelectorAll("[data-plan]").forEach((button) => {
    button.addEventListener("click", () => savePlan(venue.id, button.dataset.plan));
  });

  card.querySelectorAll("[data-call]").forEach((button) => {
    button.addEventListener("click", () => openCallModal(venue.id));
  });

  return card;
}

function findVenue(venueId) {
  return state.venues.find((venue) => venue.id === venueId);
}

function renderMiniVerification(venueId) {
  const selectedFeedback = state.feedback[feedbackKey(venueId)];
  return `
    <div class="verify-row watch-verify">
      <button data-feedback="confirmed" data-venue="${safeText(venueId)}" class="${selectedFeedback === "confirmed" ? "active" : ""}">Right place</button>
      <button data-feedback="not_showing" data-venue="${safeText(venueId)}" class="${selectedFeedback === "not_showing" ? "active" : ""}">Not showing</button>
      <button data-feedback="packed" data-venue="${safeText(venueId)}" class="${selectedFeedback === "packed" ? "active" : ""}">Too crowded</button>
      <button data-feedback="reservable" data-venue="${safeText(venueId)}" class="${selectedFeedback === "reservable" ? "active" : ""}">Can reserve</button>
    </div>
  `;
}

function renderWatchList() {
  const items = Object.values(state.watchList)
    .filter((item) => item.matchId === state.selectedMatch);
  els.watchListPanel.hidden = items.length === 0;
  els.watchListItems.innerHTML = "";

  items.forEach((item) => {
    const venue = findVenue(item.venueId);
    const expanded = state.expandedWatchItem === item.venueId;
    const row = document.createElement("div");
    row.className = `watch-item ${expanded ? "expanded" : ""}`;
    row.innerHTML = `
      <button class="watch-item-main" type="button" data-expand="${safeText(item.venueId)}">
        <span>
          <strong>${safeText(item.venueName)}</strong>
          <small>${safeText(item.status.replaceAll("_", " "))}</small>
        </span>
        <span>${expanded ? "Hide" : "Details"}</span>
      </button>
      ${expanded ? `
        <div class="watch-details">
          <div class="actions">
            ${venue ? actionLink(venue.mapsUrl, "Map", "primary") : ""}
            ${venue ? actionLink(venue.website, "Website/Reserve") : ""}
            ${venue ? actionButton("Call", `data-call="${safeText(venue.id)}"`, !venue.phone) : ""}
          </div>
          <div class="plan-row">
            <button data-plan="will_go" data-venue="${safeText(item.venueId)}" class="active">In my list</button>
            <button data-plan="already_there" data-venue="${safeText(item.venueId)}" class="${item.status === "already_there" ? "active" : ""}">Already there</button>
          </div>
          ${/already_there|called/.test(item.status) ? renderMiniVerification(item.venueId) : ""}
        </div>
      ` : ""}
    `;

    row.querySelector("[data-expand]").addEventListener("click", () => {
      state.expandedWatchItem = expanded ? "" : item.venueId;
      renderWatchList();
    });
    row.querySelectorAll("[data-plan]").forEach((button) => {
      button.addEventListener("click", () => savePlan(item.venueId, button.dataset.plan));
    });
    row.querySelectorAll("[data-feedback]").forEach((button) => {
      button.addEventListener("click", () => saveFeedback(item.venueId, button.dataset.feedback));
    });
    row.querySelectorAll("[data-call]").forEach((button) => {
      button.addEventListener("click", () => openCallModal(item.venueId));
    });
    els.watchListItems.append(row);
  });
}

function nextPlanStatus(currentPlan, requestedStatus) {
  if (!currentPlan && requestedStatus === "will_go") return "will_go";
  if (!currentPlan && requestedStatus === "already_there") return "already_there";
  if (currentPlan && requestedStatus === "will_go") return null;
  if (currentPlan && requestedStatus === "already_there") {
    return currentPlan.status === "already_there" ? "will_go" : "already_there";
  }
  return requestedStatus;
}

async function postPlanEvent(venue, eventType) {
  try {
    await apiPost("/api/plan-event", {
      venueId: venue.id,
      venueName: venue.name,
      matchId: state.selectedMatch,
      eventType
    });
  } catch {
    // Planning events are helpful but should never block the user.
  }
}

async function savePlan(venueId, status) {
  const venue = findVenue(venueId);
  if (!venue) return;
  const currentPlan = state.watchList[planKey(venueId)];
  const nextStatus = nextPlanStatus(currentPlan, status);

  if (!nextStatus) {
    await removePlan(venueId);
    return;
  }

  state.watchList[planKey(venueId)] = {
    venueId,
    venueName: venue.name,
    matchId: state.selectedMatch,
    status: nextStatus,
    updatedAt: new Date().toISOString()
  };
  await storageSet({ watchList: state.watchList });
  await postPlanEvent(venue, nextStatus);
  renderWatchList();
  renderVenues();
}

async function removePlan(venueId) {
  const venue = findVenue(venueId) || { id: venueId, name: venueId };
  delete state.watchList[planKey(venueId)];
  await storageSet({ watchList: state.watchList });
  await postPlanEvent(venue, "removed");
  renderWatchList();
  renderVenues();
}

function openCallModal(venueId) {
  const venue = findVenue(venueId);
  if (!venue || !venue.phone) return;

  els.callModal.dataset.venueId = venue.id;
  els.callVenueName.textContent = venue.name;
  els.callPhoneNumber.textContent = venue.phone;
  els.phoneAppLink.href = `tel:${venue.phone.replaceAll(" ", "")}`;
  els.callModal.hidden = false;
}

function closeCallModal() {
  els.callModal.hidden = true;
  els.callModal.dataset.venueId = "";
}

function renderVenues() {
  const venues = filteredVenues();
  els.venueList.innerHTML = "";

  if (state.isLoading) {
    els.venueList.innerHTML = `<article class="venue-card"><p class="reason">Loading real venue data...</p></article>`;
  } else if (!venues.length) {
    els.venueList.innerHTML = `<article class="venue-card"><p class="reason">No matching venues yet. Try a broader location or All filter.</p></article>`;
  } else {
    venues.forEach((venue) => els.venueList.append(renderVenue(venue)));
  }

  els.resultCount.textContent = venues.length;
  els.confirmedCount.textContent = venues.filter((venue) => venue.status === "confirmed").length;
  els.passStatus.textContent = state.insightsUnlocked ? "Unlocked" : "Locked";
  els.insightsPanel.classList.toggle("unlocked", state.insightsUnlocked);
  renderWatchList();
}

async function saveFeedback(venueId, value) {
  state.feedback[feedbackKey(venueId)] = value;
  state.insightsUnlocked = true;
  await storageSet({
    feedback: state.feedback,
    insightsUnlocked: true
  });

  try {
    await apiPost("/api/feedback", {
      venueId,
      matchId: state.selectedMatch,
      feedbackType: value
    });
    setDataText(`Signal saved - ${state.dataMode}`);
  } catch {
    setDataText("Signal saved locally - backend offline");
  }

  renderVenues();
}

function locationParams() {
  const params = new URLSearchParams({
    matchId: state.selectedMatch || "",
    radiusMeters: "5000",
    sort: state.sortMode,
    category: state.category
  });

  if (state.locationMode === "nearby" && state.coords) {
    params.set("lat", String(state.coords.lat));
    params.set("lng", String(state.coords.lng));
    params.set("location", state.locationLabel || "Nearby");
  } else {
    params.set("location", els.locationInput.value || state.locationLabel || "San Francisco, CA");
  }

  return params;
}

async function loadMatches() {
  try {
    const data = await apiGet(`/api/matches?${locationParams().toString()}`);
    if (data.matches && data.matches.length) {
      state.matches = data.matches;
      if (data.location && data.location.timeZone) state.timeZone = data.location.timeZone;
      if (data.location && data.location.label) state.locationLabel = data.location.label;
      if (!state.matches.some((match) => match.id === state.selectedMatch)) {
        state.selectedMatch = state.matches[0].id;
      }
      await storageSet({ selectedMatch: state.selectedMatch });
      renderMatches();
      updateLocationNote(data.location);
      setDataText(`Live matches - ${data.matches.length} upcoming`);
    }
  } catch {
    setDataText("Using mock matches - start backend for live data");
  }
}

async function loadRecommendations() {
  state.isLoading = true;
  renderVenues();

  try {
    const data = await apiGet(`/api/recommendations?${locationParams().toString()}`);
    state.venues = data.venues || [];
    state.liveMatch = data.match;
    state.dataMode = data.dataMode;
    if (data.location && data.location.timeZone) state.timeZone = data.location.timeZone;
    if (data.location && data.location.label) state.locationLabel = data.location.label;
    if (data.matches && data.matches.length) {
      state.matches = data.matches;
      renderMatches();
    }
    updateLocationNote(data.location);
    setDataText(`${data.dataMode} - ${state.venues.length} real venues - ${state.sortMode} - ${state.category}`);
  } catch (error) {
    state.venues = window.WCWP_DATA.venues;
    state.dataMode = "mock";
    setDataText(`Mock fallback - ${error.message}`);
  } finally {
    state.isLoading = false;
    renderVenues();
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 9000,
      maximumAge: 10 * 60 * 1000
    });
  });
}

async function useNearbyLocation() {
  els.locationNote.textContent = "Getting nearby location...";
  try {
    const position = await getCurrentPosition();
    state.locationMode = "nearby";
    state.coords = {
      lat: Number(position.coords.latitude.toFixed(6)),
      lng: Number(position.coords.longitude.toFixed(6))
    };
    state.locationLabel = "Nearby";
    await storageSet({
      locationMode: state.locationMode,
      coords: state.coords,
      locationLabel: state.locationLabel
    });
    await loadMatches();
    await loadRecommendations();
  } catch {
    state.locationMode = "manual";
    state.coords = null;
    updateLocationNote();
    setDataText("Location unavailable - using manual search");
  }
}

async function maybeAutoNearby() {
  if (state.locationMode === "nearby" && state.coords) return false;
  if (!navigator.permissions || !navigator.geolocation) return false;

  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    if (permission.state === "granted") {
      await useNearbyLocation();
      return true;
    }
  } catch {
    // Permission probing is not available in every extension/browser surface.
  }
  return false;
}

async function useManualLocation() {
  state.locationMode = "manual";
  state.coords = null;
  state.locationLabel = els.locationInput.value || "San Francisco, CA";
  await storageSet({
    location: els.locationInput.value,
    locationMode: state.locationMode,
    locationLabel: state.locationLabel,
    coords: null
  });
  await loadMatches();
  await loadRecommendations();
}

async function captureContext() {
  if (!globalThis.chrome || !chrome.tabs) {
    state.context = {
      surface: "preview",
      query: "sports bar near me",
      pageTitle: "Preview mode"
    };
    els.contextText.textContent = "Preview: sports bar near me";
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "WCWP_GET_CONTEXT" });
    if (response && response.ok) {
      state.context = response.context;
      els.contextText.textContent = `${response.context.surface.replace("_", " ")} - ${response.context.query || "No search text found"}`;
      return;
    }
  } catch {
    els.contextText.textContent = tab.url ? `Current tab: ${new URL(tab.url).hostname}` : "No context captured";
  }
}

function bindEvents() {
  els.refreshContext.addEventListener("click", captureContext);
  els.refreshData.addEventListener("click", loadRecommendations);
  els.nearbyButton.addEventListener("click", useNearbyLocation);
  els.searchLocation.addEventListener("click", useManualLocation);
  els.clearWatchList.addEventListener("click", async () => {
    state.watchList = {};
    await storageSet({ watchList: state.watchList });
    renderWatchList();
    renderVenues();
  });
  els.closeCallModal.addEventListener("click", closeCallModal);
  els.callModal.addEventListener("click", (event) => {
    if (event.target === els.callModal) closeCallModal();
  });
  els.copyPhone.addEventListener("click", async () => {
    await navigator.clipboard.writeText(els.callPhoneNumber.textContent || "");
    els.copyPhone.textContent = "Copied";
    setTimeout(() => {
      els.copyPhone.textContent = "Copy";
    }, 1000);
  });
  els.calledVenue.addEventListener("click", async () => {
    const venueId = els.callModal.dataset.venueId;
    if (venueId) await savePlan(venueId, "called");
    closeCallModal();
  });
  els.locationInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") useManualLocation();
  });
  els.matchSelect.addEventListener("change", async () => {
    state.selectedMatch = els.matchSelect.value;
    await storageSet({ selectedMatch: state.selectedMatch });
    await loadRecommendations();
  });
  els.sortSelect.addEventListener("change", async () => {
    state.sortMode = els.sortSelect.value;
    await storageSet({ sortMode: state.sortMode });
    await loadRecommendations();
  });
  els.categorySelect.addEventListener("change", async () => {
    state.category = els.categorySelect.value;
    await storageSet({ category: state.category });
    await loadRecommendations();
  });
  document.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.filter = button.dataset.filter;
      renderVenues();
    });
  });
}

async function init() {
  await loadState();
  renderMatches();
  bindEvents();
  updateLocationNote();
  renderVenues();
  await captureContext();
  const usedNearby = await maybeAutoNearby();
  if (!usedNearby) {
    await loadMatches();
    await loadRecommendations();
  }
}

init();
