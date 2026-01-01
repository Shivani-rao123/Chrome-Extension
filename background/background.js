chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SAVE_CHAT") {
    chrome.storage.local.get(["chats"], (res) => {
      const chats = res.chats || [];
      chats.push({
        ...msg.data,
        id: Date.now(),
        folder: msg.data.folder || "Unsorted"
      });

      chrome.storage.local.set({ chats });
    });
  }
});
