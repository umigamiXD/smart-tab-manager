let tabTimes = {};

// Track last accessed time
chrome.tabs.onActivated.addListener(activeInfo => {
  const now = Date.now();
  tabTimes[activeInfo.tabId] = now;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    const now = Date.now();
    tabTimes[tabId] = now;
  }
});

// Remove tab info when a tab is closed
chrome.tabs.onRemoved.addListener(tabId => {
  delete tabTimes[tabId];
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getIdleTabs") {
    const threshold = request.threshold; // in milliseconds
    chrome.tabs.query({}, tabs => {
      const now = Date.now();
      const idleTabs = tabs.filter(tab => {
        const lastUsed = tabTimes[tab.id] || now;
        return now - lastUsed > threshold && !tab.active;
      });
      sendResponse({ idleTabs });
    });
    return true; // keep response channel open
  }
});
