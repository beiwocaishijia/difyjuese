const $ = (sel) => document.querySelector(sel);

const chatEl = $("#chat");
const inputEl = $("#input");
const composerEl = $("#composer");
const sendBtn = $("#sendBtn");
const hintEl = $("#hint");
const conversationIdEl = $("#conversationId");
const currentRoleLabelEl = $("#currentRoleLabel");
const clearChatBtn = $("#clearChatBtn");
const newConversationBtn = $("#newConversationBtn");
const userNameInputEl = $("#userNameInput");
const missionInputEl = $("#missionInput");

const STORAGE_KEY = "difyWrapper:v1";
const ROLE_NAMES = { a: "埃尔文", b: "一只猪" };

function now() {
  const d = new Date();
  return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureState() {
  const s = loadState() || {};
  s.activeRole = s.activeRole || "a";
  s.userId =
    s.userId ||
    (crypto?.randomUUID ? crypto.randomUUID() : `web-${Math.random().toString(16).slice(2)}-${Date.now()}`);
  s.roles = s.roles || {};
  for (const role of ["a", "b"]) {
    s.roles[role] = s.roles[role] || {};
    s.roles[role].conversation_id = s.roles[role].conversation_id || null;
    s.roles[role].messages = Array.isArray(s.roles[role].messages) ? s.roles[role].messages : [];
    s.roles[role].inputs = s.roles[role].inputs && typeof s.roles[role].inputs === "object" ? s.roles[role].inputs : {};
  }
  return s;
}

let state = ensureState();
saveState(state);

function setHint(text) {
  hintEl.textContent = text || "";
}

function scrollToBottom() {
  chatEl.scrollTop = chatEl.scrollHeight;
}

function renderMessages() {
  const role = state.activeRole;
  const msgs = state.roles[role].messages;
  chatEl.innerHTML = "";

  if (!msgs.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "还没有消息。选择角色后开始对话。";
    chatEl.appendChild(empty);
  } else {
    for (const m of msgs) {
      const wrap = document.createElement("div");
      wrap.className = `msg ${m.from === "user" ? "msg--user" : "msg--bot"}`;
      wrap.textContent = m.text;

      const meta = document.createElement("div");
      meta.className = "msg__meta";
      meta.innerHTML = `<span>${m.time || ""}</span><span class="msg__tag">${m.from === "user" ? "YOU" : "DIFY"}</span>`;
      wrap.appendChild(meta);

      chatEl.appendChild(wrap);
    }
  }

  currentRoleLabelEl.textContent = ROLE_NAMES[role] || role.toUpperCase();
  const cid = state.roles[role].conversation_id;
  conversationIdEl.textContent = cid ? cid : "（未开始）";

  const inputs = state.roles[role].inputs || {};
  if (userNameInputEl) userNameInputEl.value = inputs.user_name || "";
  if (missionInputEl) missionInputEl.value = inputs.mission || "";

  scrollToBottom();
}

function setActiveRole(role) {
  state.activeRole = role;
  saveState(state);

  for (const btn of document.querySelectorAll(".tab")) {
    const isActive = btn.dataset.role === role;
    btn.classList.toggle("tab--active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
  }

  setHint("");
  renderMessages();
}

async function healthCheck() {
  try {
    const r = await fetch("/api/health");
    const data = await r.json();
    if (!data?.ok) throw new Error("health not ok");
    if (!data.hasRoleAKey || !data.hasRoleBKey) {
      setHint("提示：服务端未检测到某个角色的 API Key，请先配置 .env / 环境变量再试。");
    }
  } catch {
    setHint("提示：未连接到本地服务端。请先 npm install 然后 npm run dev。");
  }
}

function pushMessage(from, text) {
  const role = state.activeRole;
  state.roles[role].messages.push({ from, text, time: now() });
  saveState(state);
  renderMessages();
}

function setSending(isSending) {
  sendBtn.disabled = isSending;
  inputEl.disabled = isSending;
}

async function sendMessage(text) {
  const role = state.activeRole;
  const conversation_id = state.roles[role].conversation_id;
  const user = state.userId;
  const inputs = state.roles[role].inputs || {};

  setSending(true);
  setHint("正在请求 Dify…");
  try {
    const r = await fetch(`/api/chat/${role}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, conversation_id, user, inputs })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const details = data?.details ? JSON.stringify(data.details) : JSON.stringify(data);
      throw new Error(`${data?.error || "请求失败"}（HTTP ${r.status}）\n${details}`);
    }

    if (data?.conversation_id && !state.roles[role].conversation_id) {
      state.roles[role].conversation_id = data.conversation_id;
      saveState(state);
    }

    const answer = data?.answer ?? "";
    pushMessage("bot", answer || "（Dify 未返回 answer 字段，请检查应用类型/接口。）");
    setHint("");
  } catch (e) {
    pushMessage("bot", `请求出错：${String(e?.message || e)}`);
    setHint("");
  } finally {
    setSending(false);
    inputEl.focus();
  }
}

document.addEventListener("click", (e) => {
  const btn = e.target?.closest?.(".tab");
  if (!btn) return;
  const role = btn.dataset.role;
  if (role === "a" || role === "b") setActiveRole(role);
});

clearChatBtn.addEventListener("click", () => {
  const role = state.activeRole;
  state.roles[role].messages = [];
  saveState(state);
  renderMessages();
});

newConversationBtn.addEventListener("click", () => {
  const role = state.activeRole;
  state.roles[role].conversation_id = null;
  state.roles[role].messages = [];
  saveState(state);
  renderMessages();
  setHint("已清空 conversation_id。下一条消息会新开会话。");
});

function persistInputsFromUI() {
  const role = state.activeRole;
  state.roles[role].inputs = state.roles[role].inputs || {};
  const userName = userNameInputEl?.value?.trim?.() || "";
  const mission = missionInputEl?.value?.trim?.() || "";
  if (userName) state.roles[role].inputs.user_name = userName;
  else delete state.roles[role].inputs.user_name;
  if (mission) state.roles[role].inputs.mission = mission;
  else delete state.roles[role].inputs.mission;
  saveState(state);
}

userNameInputEl?.addEventListener?.("change", () => persistInputsFromUI());
missionInputEl?.addEventListener?.("change", () => persistInputsFromUI());

composerEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = "";
  persistInputsFromUI();
  const role = state.activeRole;
  const mission = state.roles[role]?.inputs?.mission;
  if (!mission) {
    pushMessage("bot", "请求出错：你的 Chatflow 需要 inputs.mission（必填）。请在上方 mission 输入框填好再发送。");
    return;
  }
  pushMessage("user", text);
  await sendMessage(text);
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    composerEl.requestSubmit();
  }
});

renderMessages();
healthCheck();

