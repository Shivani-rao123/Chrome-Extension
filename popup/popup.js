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

// Clear empty chats button
clearEmptyBtn.onclick = () => {
  if (!confirm("This will remove all chats with no content. Continue?")) {
    return;
  }
  chrome.storage.local.set({ folders: {} }, () => {
      alert("All chats cleared!");
      renderFolders();
  });

};

function renderFolders() {
  chrome.storage.local.get(["folders"], (res) => {
    foldersDiv.innerHTML = "";
    const folders = res.folders || {};

    // Check if there are any folders
    if (Object.keys(folders).length === 0) {
      foldersDiv.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <p class="empty-state-title">No chats yet</p>
          <p class="empty-state-text">Get started by saving your first conversation</p>
          <p class="empty-state-hint">Works with ChatGPT, Gemini, and Claude</p>
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

      const folderSection = document.createElement("div");
      folderSection.className = "folder-section";

      folderSection.innerHTML = `
        <div class="folder-header">
          <h4 class="folder-title">${folderName} <span class="folder-count">${validChats.length}</span></h4>
          <div class="folder-actions">
            <button class="btn-delete-folder">Delete</button>
          </div>
        </div>
      `;

      folderSection
        .querySelector(".btn-delete-folder")
        .onclick = () => {
          if (confirm(`Delete folder "${folderName}" and all its chats?`)) {
            delete folders[folderName];
            chrome.storage.local.set({ folders }, renderFolders);
          }
        };

      validChats.forEach(chat => {
        const chatCard = document.createElement("div");
        chatCard.className = "chat-card";

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

        chatCard.innerHTML = `
          <div class="chat-header">
            <p class="chat-title">${truncated}${displayText.length > 80 ? "..." : ""}</p>
            ${displayPrompt && displayResponse ? `<p class="chat-preview">${displayResponse.slice(0, 100)}${displayResponse.length > 100 ? "..." : ""}</p>` : ""}
          </div>
          <div class="chat-meta">
            <span class="chat-platform">${chat.platform}</span>
            ${dateStr ? `<span class="chat-date">${dateStr}</span>` : ""}
          </div>
          <div class="chat-actions">
            <button class="chat-btn chat-btn-primary view-details">View</button>
            <button class="chat-btn open">Open</button>
            <button class="chat-btn chat-btn-danger delete">Delete</button>
          </div>
        `;

        chatCard.querySelector(".view-details").onclick = (e) => {
          e.stopPropagation();
          showChatDetails(chat);
        };

        chatCard.querySelector(".open").onclick = (e) => {
          e.stopPropagation();
          chrome.tabs.create({ url: chat.url });
        };

        chatCard.querySelector(".delete").onclick = (e) => {
          e.stopPropagation();
          if (confirm("Delete this chat?")) {
            folders[folderName] =
              folders[folderName].filter(c => c.id !== chat.id);
            chrome.storage.local.set({ folders }, renderFolders);
          }
        };

        folderSection.appendChild(chatCard);
      });

      foldersDiv.appendChild(folderSection);
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
