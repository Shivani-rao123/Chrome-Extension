chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CAPTURE_CHAT") {
    const selectedText = window.getSelection().toString();

    const activeInput =
      document.activeElement &&
      (document.activeElement.tagName === "TEXTAREA" ||
        document.activeElement.tagName === "INPUT")
        ? document.activeElement.value
        : "";

    sendResponse({
      prompt: activeInput || "N/A",
      response: selectedText || "N/A",
      url: window.location.href,
      platform: window.location.hostname
    });
  }
});
