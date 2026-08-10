/* ===========================================================
   GrepMind — app.js
   Handles: theme switching, sidebar behavior, chat history,
   and talking to the /api/chat endpoint for real AI replies.
   =========================================================== */

(() => {
  const $ = (sel) => document.querySelector(sel);

  const body = document.body;
  const app = $('.app');
  const themeToggle = $('#themeToggle');
  const menuToggle = $('#menuToggle');
  const menuToggleMobile = $('#menuToggleMobile');
  const recentToggle = $('#recentToggle');
  const recentChats = $('.recent-chats');
  const chatList = $('#chatList');
  const newChatBtn = $('#newChat');
  const conversation = $('#conversation');
  const greeting = $('#greeting');
  const greetingText = $('#greetingText');
  const messagesEl = $('#messages');
  const composerForm = $('#composerForm');
  const promptInput = $('#promptInput');
  const sendBtn = $('#sendBtn');

  /* ---------------- Theme ---------------- */

  const THEME_KEY = 'grepmind-theme';

  function applyTheme(theme) {
    body.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return applyTheme(saved);
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  }

  themeToggle.addEventListener('click', () => {
    const current = body.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  initTheme();

  /* ---------------- Greeting ---------------- */

  function timeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning.';
    if (hour >= 12 && hour < 17) return 'Good afternoon.';
    if (hour >= 17 && hour < 22) return 'Good evening.';
    return 'Hello, Night Owl.';
  }

  greetingText.textContent = timeBasedGreeting();

  /* ---------------- Sidebar ---------------- */

  function isMobile() {
    return window.innerWidth <= 820;
  }

  let scrim = null;
  function ensureScrim() {
    if (scrim) return scrim;
    scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.addEventListener('click', closeSidebar);
    app.appendChild(scrim);
    return scrim;
  }

  function openSidebar() {
    if (isMobile()) {
      ensureScrim();
      app.classList.add('sidebar-open');
    } else {
      app.classList.remove('sidebar-collapsed');
    }
  }

  function closeSidebar() {
    if (isMobile()) {
      app.classList.remove('sidebar-open');
    } else {
      app.classList.add('sidebar-collapsed');
    }
  }

  function toggleSidebar() {
    const open = isMobile() ? app.classList.contains('sidebar-open') : !app.classList.contains('sidebar-collapsed');
    open ? closeSidebar() : openSidebar();
  }

  menuToggle.addEventListener('click', toggleSidebar);
  menuToggleMobile.addEventListener('click', toggleSidebar);

  recentToggle.addEventListener('click', () => {
    recentChats.classList.toggle('open');
  });

  /* ---------------- Chat history (localStorage) ---------------- */

  const HISTORY_KEY = 'grepmind-chats';
  let chats = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  let activeChatId = null;
  let activeMessages = [];

  function saveChats() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(chats));
  }

  function renderChatList() {
    chatList.innerHTML = '';
    if (!chats.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No conversations yet';
      chatList.appendChild(li);
      return;
    }
    chats.slice().reverse().forEach((chat) => {
      const li = document.createElement('li');
      li.textContent = chat.title || 'New chat';
      li.title = chat.title || 'New chat';
      li.addEventListener('click', () => loadChat(chat.id));
      chatList.appendChild(li);
    });
  }

  function loadChat(id) {
    const chat = chats.find((c) => c.id === id);
    if (!chat) return;
    activeChatId = id;
    activeMessages = chat.messages.slice();
    messagesEl.innerHTML = '';
    activeMessages.forEach((m) => renderMessage(m.role, m.content, false));
    greeting.style.display = 'none';
    if (isMobile()) closeSidebar();
  }

  function startNewChat() {
    activeChatId = null;
    activeMessages = [];
    messagesEl.innerHTML = '';
    greeting.style.display = 'flex';
    greetingText.textContent = timeBasedGreeting();
    promptInput.focus();
    if (isMobile()) closeSidebar();
  }

  newChatBtn.addEventListener('click', startNewChat);

  renderChatList();

  /* ---------------- Message rendering ---------------- */

  function renderMessage(role, content, animate = true) {
    const wrap = document.createElement('div');
    wrap.className = `msg ${role}`;
    if (!animate) wrap.style.animation = 'none';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'user' ? '🌙' : '🪐';

    const bodyEl = document.createElement('div');
    bodyEl.className = 'msg-body';

    const roleLabel = document.createElement('div');
    roleLabel.className = 'msg-role';
    roleLabel.textContent = role === 'user' ? 'You' : 'GrepMind';

    const text = document.createElement('div');
    text.className = 'msg-text';
    text.textContent = content;

    bodyEl.appendChild(roleLabel);
    bodyEl.appendChild(text);
    wrap.appendChild(avatar);
    wrap.appendChild(bodyEl);
    messagesEl.appendChild(wrap);

    conversation.scrollTop = conversation.scrollHeight;
    return text;
  }

  function renderTypingIndicator() {
    const wrap = document.createElement('div');
    wrap.className = 'msg assistant';
    wrap.id = 'typingIndicator';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = '🪐';

    const bodyEl = document.createElement('div');
    bodyEl.className = 'msg-body';

    const roleLabel = document.createElement('div');
    roleLabel.className = 'msg-role';
    roleLabel.textContent = 'GrepMind';

    const dots = document.createElement('div');
    dots.className = 'typing-dots';
    dots.innerHTML = '<span></span><span></span><span></span>';

    bodyEl.appendChild(roleLabel);
    bodyEl.appendChild(dots);
    wrap.appendChild(avatar);
    wrap.appendChild(bodyEl);
    messagesEl.appendChild(wrap);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  /* ---------------- Sending messages ---------------- */

  async function getAssistantReply(history) {
    // Talk to a serverless function (see /api/chat.js) that proxies
    // the Anthropic API. If it's not deployed yet, fall back to a
    // light local response so the UI still feels alive.
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) throw new Error('API not available');
      const data = await res.json();
      if (data.reply) return data.reply;
      throw new Error('Malformed response');
    } catch (err) {
      return localFallbackReply(history[history.length - 1]?.content || '');
    }
  }

  function localFallbackReply(prompt) {
    const p = prompt.trim();
    if (!p) return "I didn't catch that — try asking me something.";
    const openers = [
      `Here's a first pass on "${p}":`,
      `Thinking about "${p}" —`,
      `On "${p}":`,
    ];
    const opener = openers[Math.floor(Math.random() * openers.length)];
    return `${opener} the live GrepMind API isn't connected in this deployment yet, so I'm running on a local fallback. Wire up ANTHROPIC_API_KEY in your Vercel project and I'll answer for real. GrepMind Agents launch in October — full reasoning is on the way.`;
  }

  async function handleSend(prompt) {
    if (!prompt.trim()) return;

    greeting.style.display = 'none';

    if (!activeChatId) {
      activeChatId = 'chat_' + Date.now();
      chats.push({ id: activeChatId, title: prompt.slice(0, 40), messages: [] });
    }

    activeMessages.push({ role: 'user', content: prompt });
    renderMessage('user', prompt);
    saveActiveChat();

    sendBtn.disabled = true;
    promptInput.value = '';
    renderTypingIndicator();

    const reply = await getAssistantReply(activeMessages);

    removeTypingIndicator();
    activeMessages.push({ role: 'assistant', content: reply });
    renderMessage('assistant', reply);
    saveActiveChat();
    sendBtn.disabled = false;
    promptInput.focus();
  }

  function saveActiveChat() {
    const chat = chats.find((c) => c.id === activeChatId);
    if (!chat) return;
    chat.messages = activeMessages.slice();
    saveChats();
    renderChatList();
  }

  composerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSend(promptInput.value);
  });

  /* ---------------- Init ---------------- */

  if (isMobile()) app.classList.add('sidebar-collapsed');
  promptInput.focus();
})();
