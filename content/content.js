console.log("✅ AI Chat Organizer loaded on:", window.location.hostname);

/* =========================
   GLOBAL STATE
========================= */
let debounceTimer = null;
let mutationObserver = null;
let lastCapturedResponse = "";

/* =========================
   INIT
========================= */
window.addEventListener("load", () => {
  const hostname = window.location.hostname;

  const supported = [
    "chatgpt.com",
    "chat.openai.com",
    "gemini.google.com",
    "claude.ai"
  ];

  if (!supported.includes(hostname)) {
    console.log("🚫 Not a supported chat platform. Skipping observer.");
    return;
  }

  console.log("🔍 Supported platform detected:", hostname);
  initMutationObserver();
});

/* =========================
   PLATFORM DETECTION
========================= */
function detectPlatform() {
  const hostname = window.location.hostname;
  const supported = [
    "chatgpt.com",
    "chat.openai.com",
    "gemini.google.com",
    "claude.ai"
  ];

  if (supported.includes(hostname)) {
    console.log("✅ Supported platform detected:", hostname);
  } else {
    console.log("⚠️ Unsupported platform:", hostname);
  }
}

/* =========================
   MUTATION OBSERVER
========================= */
function initMutationObserver() {
  console.log("🔄 Initializing MutationObserver...");

  const chatContainer = getChatContainer();

  if (!chatContainer) {
    console.warn("⚠️ Chat container not found, retrying in 2s...");
    setTimeout(initMutationObserver, 2000);
    return;
  }

  console.log("✅ Chat container found:", chatContainer.tagName);

  mutationObserver = new MutationObserver(handleMutations);

  mutationObserver.observe(chatContainer, {
    childList: true,
    subtree: true
  });

  console.log("✅ MutationObserver started");
}

function handleMutations() {
  const hostname = window.location.hostname;

  if (
    hostname !== "chatgpt.com" &&
    hostname !== "chat.openai.com" &&
    hostname !== "gemini.google.com" &&
    hostname !== "claude.ai"
  ) {
    return;
  }

  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    onResponseComplete();
  }, 1200);
}


/* =========================
   CHAT CONTAINER
========================= */
function getChatContainer() {
  const hostname = window.location.hostname;

  if (hostname === "chatgpt.com" || hostname === "chat.openai.com") {
    return (
      document.querySelector("main") ||
      document.querySelector('[class*="conversation"]') ||
      document.body
    );
  }

  if (hostname === "gemini.google.com") {
    return document.querySelector(".chat-history") || document.body;
  }

  if (hostname === "claude.ai") {
    return document.querySelector("main") || document.body;
  }

  return document.body;
}

/* =========================
   RESPONSE COMPLETE
========================= */
function onResponseComplete() {
  console.log("📦 Extracting message pair...");

  const extractedData = extractMessagePair();

  if (!extractedData) {
    console.warn("⚠️ Extraction returned null");
    return;
  }

  if (extractedData.response === lastCapturedResponse) {
    console.log("⏩ Duplicate response ignored");
    return;
  }

  lastCapturedResponse = extractedData.response;

  console.log("═══════════════════════════════════");
  console.log("👤 USER PROMPT:\n", extractedData.prompt);
  console.log("───────────────────────────────────");
  console.log("🤖 AI RESPONSE:\n", extractedData.response);
  console.log("═══════════════════════════════════");
}

/* =========================
   EXTRACT MESSAGE PAIR
========================= */
function extractMessagePair() {
  const hostname = window.location.hostname;

  if (hostname === "chatgpt.com" || hostname === "chat.openai.com") {
    return extractChatGPTPair();
  }
  if (hostname === "gemini.google.com") {
    return extractGeminiPair();
  }
  if (hostname === "claude.ai") {
    return extractClaudePair();
  }

  return null;
}

/* =========================
   CHATGPT EXTRACTION
========================= */
function extractChatGPTPair() {
  console.log("🔍 Extracting ChatGPT pair...");

  const assistantMessages = document.querySelectorAll(
    '[data-message-author-role="assistant"]'
  );
  const userMessages = document.querySelectorAll(
    '[data-message-author-role="user"]'
  );

   if (!assistantMessages.length || !userMessages.length) {
     console.warn("⚠️ Messages not ready yet");
     return null;
}


  const lastAssistant = assistantMessages[assistantMessages.length - 1];
  const lastUser = userMessages[userMessages.length - 1];

  if (!lastAssistant?.innerText?.trim()) {
    console.warn("⚠️ Assistant response empty/streaming");
    return null;
  }

  if (!lastUser?.innerText?.trim()) {
    console.warn("⚠️ User prompt empty");
    return null;
  }

  return {
    prompt: lastUser.innerText.trim(),
    response: lastAssistant.innerText.trim(),
    platform: "ChatGPT",
    url: window.location.href
  };
}

/* =========================
   GEMINI EXTRACTION
========================= */
function extractGeminiPair() {
  const responses = document.querySelectorAll(
    '.model-response-text, [class*="model-response"]'
  );
  const userMessages = document.querySelectorAll(
    '.user-query, [class*="user-query"]'
  );

  if (!responses.length || !userMessages.length) return null;

  const response = responses[responses.length - 1]?.innerText?.trim();
  const prompt = userMessages[userMessages.length - 1]?.innerText?.trim();

  if (!response || !prompt) return null;

  return {
    prompt,
    response,
    platform: "Gemini",
    url: window.location.href
  };
}

/* =========================
   CLAUDE EXTRACTION
========================= */
function extractClaudePair() {
  const responses = document.querySelectorAll('[data-is-streaming="false"]');
  const userMessages = document.querySelectorAll(".font-user-message");

  if (!responses.length || !userMessages.length) return null;

  const response = responses[responses.length - 1]?.innerText?.trim();
  const prompt = userMessages[userMessages.length - 1]?.innerText?.trim();

  if (!response || !prompt) return null;

  return {
    prompt,
    response,
    platform: "Claude",
    url: window.location.href
  };
}

/* =========================
   MESSAGE FROM POPUP
========================= */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CAPTURE_CHAT") {
    console.log("📥 Manual capture requested");
    sendResponse(extractMessagePair());
  }
});
