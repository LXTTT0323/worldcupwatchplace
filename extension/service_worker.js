const GOOGLE_HOSTS = new Set(["www.google.com", "maps.google.com"]);

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url || info.status !== "complete") return;

  try {
    const url = new URL(tab.url);
    const enabled = GOOGLE_HOSTS.has(url.hostname);
    await chrome.sidePanel.setOptions({
      tabId,
      path: "sidepanel.html",
      enabled
    });
  } catch {
    await chrome.sidePanel.setOptions({ tabId, enabled: false });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  await chrome.sidePanel.open({ tabId: tab.id });
});
