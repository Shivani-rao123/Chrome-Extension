const foldersDiv = document.getElementById("folders");
const saveBtn = document.getElementById("save");
const clearEmptyBtn = document.getElementById("clearEmpty");

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
    document.getElementById("folder").value.trim() || "Unsorted";

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

      // Validate that we have actual content
      const hasPrompt = data.prompt && data.prompt !== "N/A" && data.prompt.trim().length > 0;
      const hasResponse = data.response && data.response !== "N/A" && data.response.trim().length > 0;
      
      if (!hasPrompt && !hasResponse) {
        alert("No content captured!\n\nTips:\n- Make sure you have a conversation on the page\n- For unsupported sites, select the AI response text before saving\n- Check the console (F12) for detailed logs");
        return;
      }

      chrome.runtime.sendMessage({
        type: "SAVE_CHAT",
        data: { ...data, folder }
      }, () => {
        // Show success and refresh
        alert("Chat saved successfully!");
        renderFolders();
      });
    }
  );
};


clearEmptyBtn.onclick = () => {
  if (!confirm("This will remove all chats with no content. Continue?")) {
    return;
  }

  chrome.storage.local.get(["folders"], (res) => {
    const folders = res.folders || {};
    let removedCount = 0;

    Object.keys(folders).forEach(folderName => {
      const originalCount = folders[folderName].length;
      
      // Filter out empty chats
      folders[folderName] = folders[folderName].filter(chat => {
        const hasPrompt = chat.prompt && chat.prompt !== "N/A" && chat.prompt.trim().length > 0;
        const hasResponse = chat.response && chat.response !== "N/A" && chat.response.trim().length > 0;
        return hasPrompt || hasResponse;
      });

      removedCount += originalCount - folders[folderName].length;

      // Remove empty folders
      if (folders[folderName].length === 0) {
        delete folders[folderName];
      }
    });

    chrome.storage.local.set({ folders }, () => {
      alert(`Removed ${removedCount} empty chat(s)`);
      renderFolders();
    });
  });
};

function renderFolders() {
  chrome.storage.local.get(["folders"], (res) => {
    foldersDiv.innerHTML = "";
    const folders = res.folders || {};

    // Check if there are any folders
    if (Object.keys(folders).length === 0) {
      foldersDiv.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #999;">
          <p style="font-size: 48px; margin: 0;">No Chats</p>
          <p style="font-size: 16px; margin: 10px 0;">No chats saved yet</p>
          <p style="font-size: 12px; color: #bbb;">Visit ChatGPT, Gemini, or Claude and save your first conversation!</p>
        </div>
      `;
      return;
    }

    Object.keys(folders).forEach(folderName => {
      // First, count valid chats in this folder
      const validChats = folders[folderName].filter(chat => {
        const hasPrompt = chat.prompt && chat.prompt !== "N/A" && chat.prompt.trim().length > 0;
        const hasResponse = chat.response && chat.response !== "N/A" && chat.response.trim().length > 0;
        return hasPrompt || hasResponse;
      });

      // Skip empty folders
      if (validChats.length === 0) {
        console.log("Skipping empty folder:", folderName);
        return;
      }

      const folderDiv = document.createElement("div");
      folderDiv.className = "folder-container";

      folderDiv.innerHTML = `
        <div class="folder-header">
          <h4>${folderName} <span class="chat-count">(${validChats.length})</span></h4>
          <button class="delete-folder">Delete</button>
        </div>
      `;

      folderDiv
        .querySelector(".delete-folder")
        .onclick = () => {
          if (confirm(`Delete folder "${folderName}" and all its chats?`)) {
            delete folders[folderName];
            chrome.storage.local.set({ folders }, renderFolders);
          }
        };

      validChats.forEach(chat => {
        const chatDiv = document.createElement("div");
        chatDiv.className = "chat-item";

        // Show response if prompt is N/A, or show both
        const hasPrompt = chat.prompt && chat.prompt !== "N/A" && chat.prompt.trim().length > 0;
        const hasResponse = chat.response && chat.response !== "N/A" && chat.response.trim().length > 0;
        
        const displayPrompt = hasPrompt ? chat.prompt : null;
        const displayResponse = hasResponse ? chat.response : null;
        
        const displayText = displayPrompt || displayResponse || "No content captured";
        const truncated = displayText.slice(0, 80);
        
        const dateStr = chat.timestamp 
          ? new Date(chat.timestamp).toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          : "";

        chatDiv.innerHTML = `
          <div class="chat-content">
            <p class="chat-text"><strong>${truncated}${displayText.length > 80 ? "..." : ""}</strong></p>
            ${displayPrompt && displayResponse ? `<small class="chat-preview">${displayResponse.slice(0, 60)}...</small>` : ""}
            <small class="chat-meta">${chat.platform} ${dateStr ? "| " + dateStr : ""}</small>
          </div>
          <div class="chat-actions">
            <button class="view-details">View Details</button>
            <button class="open">Open</button>
            <button class="delete">Delete</button>
          </div>
        `;

        chatDiv.querySelector(".view-details").onclick = () => {
          showChatDetails(chat);
        };

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

// Show chat details in modal
function showChatDetails(chat) {
  // Remove existing modal if any
  const existingModal = document.getElementById('chatModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal
  const modal = document.createElement('div');
  modal.id = 'chatModal';
  modal.className = 'modal';
  
  const promptText = chat.prompt && chat.prompt !== "N/A" ? chat.prompt : "(No prompt captured)";
  const responseText = chat.response && chat.response !== "N/A" ? chat.response : "(No response captured)";
  const dateStr = chat.timestamp 
    ? new Date(chat.timestamp).toLocaleString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      })
    : "Unknown date";

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Chat Details</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="detail-section">
          <div class="detail-label">USER PROMPT:</div>
          <div class="detail-text">${promptText}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">AI RESPONSE:</div>
          <div class="detail-text">${responseText}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">METADATA:</div>
          <div class="detail-meta">
            <p><strong>Platform:</strong> ${chat.platform}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>URL:</strong> <a href="${chat.url}" target="_blank">${chat.url}</a></p>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn-open">Open in Browser</button>
        <button class="modal-btn-close">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  modal.querySelector('.modal-close').onclick = () => modal.remove();
  modal.querySelector('.modal-btn-close').onclick = () => modal.remove();
  modal.querySelector('.modal-btn-open').onclick = () => {
    chrome.tabs.create({ url: chat.url });
    modal.remove();
  };
  
  // Close on background click
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
}

renderFolders();
