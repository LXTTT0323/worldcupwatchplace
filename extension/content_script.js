function readSearchContext() {
  const url = new URL(window.location.href);
  const isMaps = url.pathname.startsWith("/maps") || url.hostname === "maps.google.com";
  const queryParam = url.searchParams.get("q") || url.searchParams.get("query");
  const searchInput = document.querySelector("textarea[name='q'], input[name='q'], input[aria-label='Search Google Maps']");
  const visibleTitle = document.title.replace(" - Google Search", "").replace(" - Google Maps", "");

  return {
    href: window.location.href,
    hostname: url.hostname,
    surface: isMaps ? "google_maps" : "google_search",
    query: queryParam || (searchInput && searchInput.value) || visibleTitle || "",
    pageTitle: document.title,
    capturedAt: new Date().toISOString()
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "WCWP_GET_CONTEXT") {
    sendResponse({ ok: true, context: readSearchContext() });
  }
  return true;
});
