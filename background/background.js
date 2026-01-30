chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copy-clean-text",
    title: "Copy without decor",
    contexts: ["selection"]
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SAVE_CHAT") {
    chrome.storage.local.get(["folders"], (res) => {
      const folders = res.folders || {};
      const folderName = msg.data.folder || "Unsorted";

      if (!folders[folderName]) {
        folders[folderName] = [];
      }

      folders[folderName].push({
        id: Date.now(),
        prompt: msg.data.prompt,
        response: msg.data.response,
        url: msg.data.url,
        platform: msg.data.platform,
        timestamp: Date.now()
      });

      chrome.storage.local.set({ folders }, () => {
        console.log("✅ Chat saved to folder:", folderName);
        sendResponse({ success: true });
      });
    });
    
    return true; // Keep message channel open for async response
  }
});
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("🖱 Context menu clicked:", info.menuItemId);

  if (info.menuItemId === "copy-clean-text") {
    chrome.tabs.sendMessage(tab.id, {
      type: "COPY_CLEAN_SELECTION"
    });
  }
});
