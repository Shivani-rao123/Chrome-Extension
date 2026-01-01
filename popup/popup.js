const chatList = document.getElementById("chatList");

document.getElementById("save").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const folder = document.getElementById("folder").value || "Unsorted";

  chrome.tabs.sendMessage(tab.id, { type: "CAPTURE_CHAT" }, (data) => {
    chrome.runtime.sendMessage({
      type: "SAVE_CHAT",
      data: { ...data, folder }
    });
  });
};

function renderChats() {
  chrome.storage.local.get(["chats"], (res) => {
    chatList.innerHTML = "";
    (res.chats || []).forEach(chat => {
      const div = document.createElement("div");
      div.innerHTML = `
        <b>${chat.folder}</b>
        <p>${chat.platform}</p>
        <small>${chat.prompt.slice(0, 40)}</small>
      `;
      div.onclick = () => {
        chrome.tabs.create({ url: chat.url });
      };
      chatList.appendChild(div);
    });
  });
}

renderChats();
