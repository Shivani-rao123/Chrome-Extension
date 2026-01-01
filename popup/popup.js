const foldersDiv = document.getElementById("folders");
const saveBtn = document.getElementById("save");

saveBtn.onclick = async () => {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tab || !tab.id) {
    alert("No active tab found");
    return;
  }

  const folder =
    document.getElementById("folder").value || "Unsorted";

  chrome.tabs.sendMessage(
    tab.id,
    { type: "CAPTURE_CHAT" },
    (data) => {
      // 🔥 THIS FIXES YOUR ERROR
      if (chrome.runtime.lastError) {
        alert(
          "Cannot capture chat on this page.\n" +
          "Refresh the page and try again."
        );
        return;
      }

      if (!data) {
        alert("No data captured. Select response text.");
        return;
      }

      chrome.runtime.sendMessage({
        type: "SAVE_CHAT",
        data: { ...data, folder }
      });
    }
  );
};

function renderFolders() {
  chrome.storage.local.get(["folders"], (res) => {
    foldersDiv.innerHTML = "";
    const folders = res.folders || {};

    Object.keys(folders).forEach(folderName => {
      const folderDiv = document.createElement("div");

      folderDiv.innerHTML = `
        <h4>
          ${folderName}
          <button class="delete-folder">Delete</button>
        </h4>
      `;

      folderDiv
        .querySelector(".delete-folder")
        .onclick = () => {
          delete folders[folderName];
          chrome.storage.local.set({ folders }, renderFolders);
        };

      folders[folderName].forEach(chat => {
        const chatDiv = document.createElement("div");
        chatDiv.style.marginLeft = "12px";

        chatDiv.innerHTML = `
          <p>${chat.prompt.slice(0, 50)}...</p>
          <small>${chat.platform}</small><br/>
          <button class="open">Open</button>
          <button class="delete">Delete</button>
        `;

        chatDiv.querySelector(".open").onclick = () => {
          chrome.tabs.create({ url: chat.url });
        };

        chatDiv.querySelector(".delete").onclick = () => {
          folders[folderName] =
            folders[folderName].filter(c => c.id !== chat.id);
          chrome.storage.local.set({ folders }, renderFolders);
        };

        folderDiv.appendChild(chatDiv);
      });

      foldersDiv.appendChild(folderDiv);
    });
  });
}

renderFolders();
