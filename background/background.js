chrome.runtime.onMessage.addListener((msg) => {
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

      chrome.storage.local.set({ folders });
    });
  }
});
