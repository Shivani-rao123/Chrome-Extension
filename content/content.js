console.log("✅ AI Chat Organizer loaded on:", window.location.hostname);

// Auto-detect when page loads
window.addEventListener('load', () => {
  console.log("🔍 Detecting chat elements...");
  detectPlatform();
});

function detectPlatform() {
  const hostname = window.location.hostname;
  const supported = ["chatgpt.com", "chat.openai.com", "gemini.google.com", "claude.ai"];
  
  if (supported.includes(hostname)) {
    console.log("✅ Supported platform detected:", hostname);
  } else {
    console.log("⚠️ Unsupported platform:", hostname);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CAPTURE_CHAT") {
    console.log("📥 Capture request received");
    
    const capturedData = captureChatData();
    console.log("📤 Sending data:", capturedData);
    
    sendResponse(capturedData);
  }
});

function captureChatData() {
  const hostname = window.location.hostname;
  
  // Platform-specific capture
  if (hostname === "chatgpt.com" || hostname === "chat.openai.com") {
    return captureChatGPT();
  } else if (hostname === "gemini.google.com") {
    return captureGemini();
  } else if (hostname === "claude.ai") {
    return captureClaude();
  }
  
  // Fallback to generic
  return captureGeneric();
}

function captureChatGPT() {
  console.log("🤖 Capturing ChatGPT conversation...");
  
  // Try multiple selectors for the input
  const promptInput = document.querySelector('textarea[id*="prompt"]') || 
                     document.querySelector('textarea[placeholder*="Message"]') ||
                     document.querySelector('#prompt-textarea');
  
  // Get last assistant response - try multiple selectors
  const assistantMessages = document.querySelectorAll('[data-message-author-role="assistant"], .agent-turn');
  const lastResponse = assistantMessages[assistantMessages.length - 1];
  
  // Get last user message - try multiple selectors
  const userMessages = document.querySelectorAll('[data-message-author-role="user"], .user-turn');
  const lastUserMessage = userMessages[userMessages.length - 1];
  
  let prompt = "N/A";
  let response = "N/A";
  
  // Try to get prompt from different sources
  if (promptInput?.value && promptInput.value.trim().length > 0) {
    prompt = promptInput.value.trim();
  } else if (lastUserMessage?.innerText && lastUserMessage.innerText.trim().length > 0) {
    prompt = lastUserMessage.innerText.trim();
  }
  
  // Try to get response from different sources
  if (lastResponse?.innerText && lastResponse.innerText.trim().length > 0) {
    response = lastResponse.innerText.trim();
  } else {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 0) {
      response = selectedText;
    }
  }
  
  console.log("✅ Prompt length:", prompt.length, "Response length:", response.length);
  console.log("📝 Prompt preview:", prompt.slice(0, 50));
  console.log("💬 Response preview:", response.slice(0, 50));
  
  return {
    prompt: prompt,
    response: response,
    url: window.location.href,
    platform: "ChatGPT"
  };
}

function captureGemini() {
  console.log("💎 Capturing Gemini conversation...");
  
  const promptInput = document.querySelector('.ql-editor') || 
                     document.querySelector('[contenteditable="true"]') ||
                     document.querySelector('rich-textarea');
  
  // Get all response containers - try multiple selectors
  const responses = document.querySelectorAll('.model-response-text, [class*="model-response"], [data-test-id*="model-response"], .response-container');
  const lastResponse = responses[responses.length - 1];
  
  // Get user messages - try multiple selectors
  const userMessages = document.querySelectorAll('.user-query, [class*="user-query"], [data-test-id*="user-query"], .query-container');
  const lastUserMessage = userMessages[userMessages.length - 1];
  
  let prompt = "N/A";
  let response = "N/A";
  
  // Try to get prompt
  if (promptInput?.innerText && promptInput.innerText.trim().length > 0) {
    prompt = promptInput.innerText.trim();
  } else if (lastUserMessage?.innerText && lastUserMessage.innerText.trim().length > 0) {
    prompt = lastUserMessage.innerText.trim();
  }
  
  // Try to get response
  if (lastResponse?.innerText && lastResponse.innerText.trim().length > 0) {
    response = lastResponse.innerText.trim();
  } else {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText.length > 0) {
      response = selectedText;
    }
  }
  
  console.log("✅ Prompt length:", prompt.length, "Response length:", response.length);
  console.log("📝 Prompt preview:", prompt.slice(0, 50));
  console.log("💬 Response preview:", response.slice(0, 50));
  
  return {
    prompt: prompt,
    response: response,
    url: window.location.href,
    platform: "Gemini"
  };
}

function captureClaude() {
  console.log("🎭 Capturing Claude conversation...");
  
  const promptInput = document.querySelector('div[contenteditable="true"][role="textbox"]');
  
  // Get assistant responses
  const responses = document.querySelectorAll('[data-is-streaming="false"]');
  const lastResponse = responses[responses.length - 1];
  
  // Get user messages
  const userMessages = document.querySelectorAll('.font-user-message');
  const lastUserMessage = userMessages[userMessages.length - 1];
  
  const prompt = promptInput?.innerText || lastUserMessage?.innerText || "N/A";
  const response = lastResponse?.innerText || window.getSelection().toString() || "N/A";
  
  console.log("Prompt length:", prompt.length, "Response length:", response.length);
  
  return {
    prompt: prompt,
    response: response,
    url: window.location.href,
    platform: "Claude"
  };
}

function captureGeneric() {
  console.log("📝 Using generic capture method...");
  
  const selectedText = window.getSelection().toString();
  const activeInput = document.activeElement &&
    (document.activeElement.tagName === "TEXTAREA" ||
     document.activeElement.tagName === "INPUT")
    ? document.activeElement.value
    : "";
  
  console.log("Selected text length:", selectedText.length, "Input length:", activeInput.length);
  
  return {
    prompt: activeInput || "N/A",
    response: selectedText || "N/A",
    url: window.location.href,
    platform: window.location.hostname
  };
}
