// Einfache Discord-ähnliche Vorlage ohne Backend.
// - Nutzer werden im localStorage gespeichert
// - Nachrichten & Channels werden pro Nutzer + Server im localStorage gespeichert

const STORAGE_KEYS = {
  USERS: "dv_users",
  SESSION: "dv_session",
  DATA: "dv_data",
};

const defaultServers = [
  { id: "all", name: "Community" },
  { id: "dev", name: "Developer" },
  { id: "fun", name: "Fun" },
];

const defaultChannels = [
  { id: "general", name: "allgemein" },
  { id: "random", name: "random" },
];

const authScreen = document.getElementById("auth-screen");
const appShell = document.getElementById("app-shell");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const tabButtons = document.querySelectorAll(".tab-button");
const channelListEl = document.getElementById("channel-list");
const messageListEl = document.getElementById("message-list");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const currentChannelNameEl = document.getElementById("current-channel-name");
const currentUserDisplayEl = document.getElementById("current-user-display");
const logoutBtn = document.getElementById("logout-btn");
const profileBtn = document.getElementById("profile-btn");
const addChannelBtn = document.getElementById("add-channel-btn");
const serverButtons = document.querySelectorAll(".server-circle[data-server]");
const tabChatBtn = document.getElementById("tab-chat");
const tabFriendsBtn = document.getElementById("tab-friends");
const chatViewEl = document.getElementById("chat-view");
const friendsViewEl = document.getElementById("friends-view");
const contextHashEl = document.getElementById("context-hash");

// Freunde / DMs
const friendSearchInput = document.getElementById("friend-search-input");
const addFriendBtn = document.getElementById("add-friend-btn");
const friendsListEl = document.getElementById("friends-list");
const friendsPageInput = document.getElementById("friends-page-input");
const friendsPageAddBtn = document.getElementById("friends-page-add-btn");
const friendsMainEmpty = document.getElementById("friends-main-empty");
const friendsBadge = document.getElementById("friends-badge");

// Profil-Modal (eigenes Profil)
const profileModal = document.getElementById("profile-modal");
const profileForm = document.getElementById("profile-form");
const profileUsernameInput = document.getElementById("profile-username");
const profileEmailInput = document.getElementById("profile-email");
const profileCancelBtn = document.getElementById("profile-cancel");

// User-Modal (andere Nutzer)
const userModal = document.getElementById("user-modal");
const userModalForm = document.getElementById("user-modal-form");
const userModalAvatar = document.getElementById("user-modal-avatar");
const userModalName = document.getElementById("user-modal-name");
const userModalEmail = document.getElementById("user-modal-email");
const userModalNicknameInput = document.getElementById("user-modal-nickname");
const userModalReportBtn = document.getElementById("user-modal-report");
const userModalCloseBtn = document.getElementById("user-modal-close");

let currentUser = null;
let currentServerId = "all";
let currentChannelId = "general";
let currentView = "channel"; // "channel" | "dm" | "friends"
let currentDmUserId = null;
let currentProfileUserId = null;

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION));
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  } else {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  }
}

function loadData() {
  try {
    return (
      JSON.parse(localStorage.getItem(STORAGE_KEYS.DATA)) || {
        servers: defaultServers,
        channelsByServer: {
          all: [...defaultChannels],
          dev: [...defaultChannels],
          fun: [...defaultChannels],
        },
        messages: {},
        friendsByUserId: {},
        dmMessages: {},
        friendRequestsByUserId: {},
        nicknamesByUserId: {},
      }
    );
  } catch {
    return {
      servers: defaultServers,
      channelsByServer: {
        all: [...defaultChannels],
        dev: [...defaultChannels],
        fun: [...defaultChannels],
      },
      messages: {},
      friendsByUserId: {},
      dmMessages: {},
      friendRequestsByUserId: {},
      nicknamesByUserId: {},
    };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(data));
}

function getCurrentKey() {
  if (!currentUser) return null;
  if (currentView === "channel") {
    return `${currentUser.id}:${currentServerId}:${currentChannelId}`;
  }
  if (currentView === "dm" && currentDmUserId) {
    return `dm:${getDmKeyFor(currentUser.id, currentDmUserId)}`;
  }
  return null;
}

function getDmKeyFor(a, b) {
  return [a, b].sort().join("|");
}

function ensureBaseStructure() {
  const data = loadData();
  if (!data.channelsByServer) data.channelsByServer = {};
  defaultServers.forEach((s) => {
    if (!data.channelsByServer[s.id]) {
      data.channelsByServer[s.id] = [...defaultChannels];
    }
  });
  if (!data.messages) data.messages = {};
  if (!data.friendsByUserId) data.friendsByUserId = {};
  if (!data.dmMessages) data.dmMessages = {};
  if (!data.friendRequestsByUserId) data.friendRequestsByUserId = {};
  if (!data.nicknamesByUserId) data.nicknamesByUserId = {};
  saveData(data);
}

function switchToApp() {
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
}

function switchToAuth() {
  appShell.classList.add("hidden");
  authScreen.classList.remove("hidden");
}

function setActiveTab(tab) {
  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  if (tab === "login") {
    loginForm.classList.add("active");
    registerForm.classList.remove("active");
  } else {
    registerForm.classList.add("active");
    loginForm.classList.remove("active");
  }
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setActiveTab(btn.dataset.tab);
  });
});

registerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value.trim();
  const email = document.getElementById("register-email").value.trim().toLowerCase();
  const password = document.getElementById("register-password").value;

  if (!username || !email || !password) return;

  const users = loadUsers();
  if (users.find((u) => u.email === email)) {
    alert("Es existiert bereits ein Konto mit dieser E‑Mail.");
    return;
  }

  const newUser = {
    id: `u_${Date.now()}`,
    username,
    email,
    password,
  };
  users.push(newUser);
  saveUsers(users);
  saveSession({ userId: newUser.id });
  currentUser = newUser;
  initAppForUser();
  registerForm.reset();
});

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;

  const users = loadUsers();
  const found = users.find((u) => u.email === email && u.password === password);
  if (!found) {
    alert("E‑Mail oder Passwort ist falsch.");
    return;
  }
  currentUser = found;
  saveSession({ userId: found.id });
  initAppForUser();
  loginForm.reset();
});

logoutBtn.addEventListener("click", () => {
  saveSession(null);
  currentUser = null;
  switchToAuth();
});

function setMainView(view) {
  currentView = view;
  tabChatBtn.classList.toggle("active", view !== "friends");
  tabFriendsBtn.classList.toggle("active", view === "friends");

  if (view === "friends") {
    chatViewEl.classList.add("hidden");
    friendsViewEl.classList.remove("hidden");
    contextHashEl.textContent = "";
    currentChannelNameEl.textContent = "Freunde";
  } else {
    friendsViewEl.classList.add("hidden");
    chatViewEl.classList.remove("hidden");
    contextHashEl.textContent = currentView === "dm" ? "@" : "#";
  }
}

tabChatBtn.addEventListener("click", () => {
  if (!currentUser) return;
  if (currentView === "friends") {
    currentView = "channel";
  }
  setMainView(currentView);
  renderMessages();
});

tabFriendsBtn.addEventListener("click", () => {
  if (!currentUser) return;
  setMainView("friends");
  updateFriendsEmptyState();
});

// Profil bearbeiten
profileBtn.addEventListener("click", () => {
  if (!currentUser) return;
  profileUsernameInput.value = currentUser.username;
  profileEmailInput.value = currentUser.email;
  profileModal.classList.remove("hidden");
});

profileCancelBtn.addEventListener("click", () => {
  profileModal.classList.add("hidden");
});

profileModal.addEventListener("click", (e) => {
  if (e.target === profileModal) {
    profileModal.classList.add("hidden");
  }
});

profileForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const newName = profileUsernameInput.value.trim();
  const newEmail = profileEmailInput.value.trim().toLowerCase();
  if (!newName || !newEmail) return;

  const users = loadUsers();
  const existingWithEmail = users.find(
    (u) => u.email === newEmail && u.id !== currentUser.id
  );
  if (existingWithEmail) {
    alert("Diese E‑Mail wird bereits von einem anderen Konto verwendet.");
    return;
  }

  const updatedUsers = users.map((u) =>
    u.id === currentUser.id ? { ...u, username: newName, email: newEmail } : u
  );
  saveUsers(updatedUsers);

  currentUser = { ...currentUser, username: newName, email: newEmail };
  currentUserDisplayEl.textContent = `${currentUser.username} (${currentUser.email})`;

  profileModal.classList.add("hidden");
  renderFriends();
  renderMessages();
});

function renderFriends() {
  if (!currentUser) return;
  const data = loadData();
  const users = loadUsers();
  const friendIds = data.friendsByUserId[currentUser.id] || [];

  friendsListEl.innerHTML = "";

  friendIds.forEach((friendId) => {
    const u = users.find((x) => x.id === friendId);
    if (!u) return;
    const nickMap = data.nicknamesByUserId[currentUser.id] || {};
    const displayName = nickMap[friendId] || u.username;

    const li = document.createElement("li");
    li.className = "friend-item";
    if (currentView === "dm" && currentDmUserId === friendId) {
      li.classList.add("active");
    }

    const avatar = document.createElement("div");
    avatar.className = "friend-avatar";
    avatar.textContent = displayName[0]?.toUpperCase() || "?";

    const main = document.createElement("div");
    main.className = "friend-main";

    const name = document.createElement("span");
    name.className = "friend-name";
    name.textContent = displayName;

    const sub = document.createElement("span");
    sub.className = "friend-sub";
    sub.textContent = u.username === displayName ? u.email : `${u.username} • ${u.email}`;

    main.appendChild(name);
    main.appendChild(sub);

    li.appendChild(avatar);
    li.appendChild(main);

    avatar.addEventListener("click", (ev) => {
      ev.stopPropagation();
      openUserModal(friendId);
    });

    li.addEventListener("click", () => {
      currentView = "dm";
      currentDmUserId = friendId;
      currentChannelNameEl.textContent = `@${displayName}`;
      messageInput.placeholder = `Nachricht an @${displayName} senden`;
      renderFriends();
      renderMessages();
    });

    friendsListEl.appendChild(li);
  });

  updateFriendsEmptyState();
}

function updateFriendsEmptyState() {
  if (!friendsMainEmpty) return;
  const data = loadData();
  const friendIds = currentUser ? data.friendsByUserId[currentUser.id] || [] : [];
  friendsMainEmpty.classList.toggle("hidden", friendIds.length > 0);

  const requests = currentUser
    ? data.friendRequestsByUserId[currentUser.id] || []
    : [];
  if (friendsBadge) {
    const count = requests.length;
    friendsBadge.textContent = count;
    friendsBadge.classList.toggle("hidden", count === 0);
  }

  const requestsContainer = document.getElementById("friends-main-requests");
  if (requestsContainer) {
    requestsContainer.innerHTML = "";
    if (!currentUser || !requests.length) return;
    const users = loadUsers();

    requests.forEach((fromId) => {
      const u = users.find((x) => x.id === fromId);
      if (!u) return;
      const item = document.createElement("div");
      item.className = "friend-request-item";

      const main = document.createElement("div");
      main.className = "friend-request-main";

      const avatar = document.createElement("div");
      avatar.className = "friend-avatar";
      avatar.textContent = u.username[0]?.toUpperCase() || "?";

      const textWrap = document.createElement("div");
      const name = document.createElement("div");
      name.className = "friend-request-name";
      name.textContent = u.username;
      const email = document.createElement("div");
      email.className = "friend-request-email";
      email.textContent = u.email;
      textWrap.appendChild(name);
      textWrap.appendChild(email);

      main.appendChild(avatar);
      main.appendChild(textWrap);

      const actions = document.createElement("div");
      actions.className = "friend-request-actions";

      const acceptBtn = document.createElement("button");
      acceptBtn.className = "primary-btn small";
      acceptBtn.textContent = "Annehmen";
      acceptBtn.addEventListener("click", () => {
        const d = loadData();
        d.friendRequestsByUserId[currentUser.id] =
          (d.friendRequestsByUserId[currentUser.id] || []).filter(
            (id) => id !== fromId
          );
        if (!d.friendsByUserId[currentUser.id]) d.friendsByUserId[currentUser.id] = [];
        if (!d.friendsByUserId[fromId]) d.friendsByUserId[fromId] = [];
        if (!d.friendsByUserId[currentUser.id].includes(fromId)) {
          d.friendsByUserId[currentUser.id].push(fromId);
        }
        if (!d.friendsByUserId[fromId].includes(currentUser.id)) {
          d.friendsByUserId[fromId].push(currentUser.id);
        }
        saveData(d);
        renderFriends();
      });

      const declineBtn = document.createElement("button");
      declineBtn.className = "secondary-btn small";
      declineBtn.textContent = "Ablehnen";
      declineBtn.addEventListener("click", () => {
        const d = loadData();
        d.friendRequestsByUserId[currentUser.id] =
          (d.friendRequestsByUserId[currentUser.id] || []).filter(
            (id) => id !== fromId
          );
        saveData(d);
        updateFriendsEmptyState();
      });

      actions.appendChild(acceptBtn);
      actions.appendChild(declineBtn);

      item.appendChild(main);
      item.appendChild(actions);
      requestsContainer.appendChild(item);
    });
  }
}

addFriendBtn.addEventListener("click", () => {
  if (!currentUser) return;
  const query = friendSearchInput.value.trim().toLowerCase();
  if (!query) return;

  const users = loadUsers();
  const found = users.find(
    (u) =>
      (u.username.toLowerCase() === query || u.email.toLowerCase() === query) &&
      u.id !== currentUser.id
  );

  if (!found) {
    alert("Kein Nutzer mit diesem Namen oder dieser E‑Mail gefunden.");
    return;
  }

  const data = loadData();
  if (!data.friendRequestsByUserId[found.id]) {
    data.friendRequestsByUserId[found.id] = [];
  }
  if (
    data.friendRequestsByUserId[found.id].includes(currentUser.id) ||
    (data.friendsByUserId[found.id] || []).includes(currentUser.id)
  ) {
    alert("Es besteht bereits eine Freundschaft oder Anfrage.");
    return;
  }

  data.friendRequestsByUserId[found.id].push(currentUser.id);
  saveData(data);

  friendSearchInput.value = "";
  alert("Freundschaftsanfrage gesendet.");
});

friendsPageAddBtn.addEventListener("click", () => {
  if (!currentUser) return;
  const value = friendsPageInput.value.trim();
  if (!value) return;
  friendSearchInput.value = value;
  addFriendBtn.click();
  friendsPageInput.value = "";
});

// User-Modal Logik
function openUserModal(userId) {
  if (!currentUser || !userId || userId === currentUser.id) return;
  const users = loadUsers();
  const data = loadData();
  const u = users.find((x) => x.id === userId);
  if (!u) return;
  currentProfileUserId = userId;
  const nickMap = data.nicknamesByUserId[currentUser.id] || {};
  const nick = nickMap[userId] || "";

  userModalAvatar.textContent = (nick || u.username)[0]?.toUpperCase() || "?";
  userModalName.textContent = nick || u.username;
  userModalEmail.textContent = u.email;
  userModalNicknameInput.value = nick;

  userModal.classList.remove("hidden");
}

userModalCloseBtn.addEventListener("click", () => {
  userModal.classList.add("hidden");
  currentProfileUserId = null;
});

userModal.addEventListener("click", (e) => {
  if (e.target === userModal) {
    userModal.classList.add("hidden");
    currentProfileUserId = null;
  }
});

userModalReportBtn.addEventListener("click", () => {
  if (!currentProfileUserId) return;
  alert("Danke für deine Meldung. In dieser Vorlage wird sie nur lokal gespeichert.");
});

userModalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!currentUser || !currentProfileUserId) return;
  const data = loadData();
  if (!data.nicknamesByUserId[currentUser.id]) {
    data.nicknamesByUserId[currentUser.id] = {};
  }
  const value = userModalNicknameInput.value.trim();
  if (value) {
    data.nicknamesByUserId[currentUser.id][currentProfileUserId] = value;
  } else {
    delete data.nicknamesByUserId[currentUser.id][currentProfileUserId];
  }
  saveData(data);
  userModal.classList.add("hidden");
  renderFriends();
  renderMessages();
});

function renderChannels() {
  const data = loadData();
  const channels = data.channelsByServer[currentServerId] || [];
  channelListEl.innerHTML = "";

  channels.forEach((channel) => {
    const li = document.createElement("li");
    li.className = "channel-item";
    if (channel.id === currentChannelId) li.classList.add("active");

    const main = document.createElement("div");
    main.className = "channel-main";
    const hash = document.createElement("span");
    hash.textContent = "#";
    const name = document.createElement("span");
    name.textContent = channel.name;
    main.appendChild(hash);
    main.appendChild(name);

    li.appendChild(main);

    const delBtn = document.createElement("button");
    delBtn.className = "channel-delete";
    delBtn.textContent = "×";
    delBtn.title = "Kanal löschen";

    delBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (!confirm(`Kanal #${channel.name} wirklich löschen?`)) return;
      const dataInner = loadData();
      dataInner.channelsByServer[currentServerId] =
        dataInner.channelsByServer[currentServerId].filter((c) => c.id !== channel.id);
      saveData(dataInner);
      if (currentChannelId === channel.id) {
        const remaining = dataInner.channelsByServer[currentServerId];
        currentChannelId = remaining[0]?.id || null;
      }
      renderChannels();
      renderMessages();
    });

    li.addEventListener("click", () => {
      currentView = "channel";
      currentDmUserId = null;
      currentChannelId = channel.id;
      currentChannelNameEl.textContent = channel.name;
      messageInput.placeholder = `Nachricht an #${channel.name} senden`;
      contextHashEl.textContent = "#";
      setMainView("channel");
      renderChannels();
      renderMessages();
    });

    li.appendChild(delBtn);
    channelListEl.appendChild(li);
  });
}

function renderMessages() {
  messageListEl.innerHTML = "";
  const key = getCurrentKey();
  if (!key) return;

  const data = loadData();
  const users = loadUsers();
  let messages = [];

  if (currentView === "channel") {
    messages = data.messages[key] || [];
  } else if (currentView === "dm" && currentDmUserId) {
    const dmKey = getDmKeyFor(currentUser.id, currentDmUserId);
    messages = data.dmMessages[dmKey] || [];
  }

  messages.forEach((msg) => {
    const row = document.createElement("div");
    const isMe =
      msg.authorId === currentUser.id || msg.author === currentUser.username;
    row.className = `message-row ${isMe ? "me" : "other"}`;

    const authorUser =
      users.find((u) => u.id === msg.authorId) ||
      users.find((u) => u.username === msg.author);
    const dataNick = data.nicknamesByUserId[currentUser.id] || {};
    const displayName =
      (authorUser && dataNick[authorUser.id]) || authorUser?.username || msg.author;

    const avatar = document.createElement("div");
    avatar.className = "avatar-circle";
    avatar.textContent = displayName[0]?.toUpperCase() || "?";

    const content = document.createElement("div");
    content.className = "message-content";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    const header = document.createElement("div");
    header.className = "message-header";
    const authorEl = document.createElement("span");
    authorEl.className = "message-author";
    authorEl.textContent = displayName;
    const time = document.createElement("span");
    time.className = "message-time";
    time.textContent = new Date(msg.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    header.appendChild(authorEl);
    header.appendChild(time);

    const text = document.createElement("div");
    text.className = "message-text";
    text.textContent = msg.text;

    bubble.appendChild(header);
    bubble.appendChild(text);
    content.appendChild(bubble);

    if (authorUser && authorUser.id !== currentUser.id) {
      avatar.addEventListener("click", () => openUserModal(authorUser.id));
      authorEl.addEventListener("click", () => openUserModal(authorUser.id));
    }

    row.appendChild(avatar);
    row.appendChild(content);

    messageListEl.appendChild(row);
  });

  messageListEl.scrollTop = messageListEl.scrollHeight;
}

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !currentUser) return;

  const data = loadData();
  const key = getCurrentKey();
  const message = {
    id: `m_${Date.now()}`,
    authorId: currentUser.id,
    author: currentUser.username,
    text,
    createdAt: Date.now(),
  };

  if (currentView === "channel") {
    if (!data.messages[key]) data.messages[key] = [];
    data.messages[key].push(message);
  } else if (currentView === "dm" && currentDmUserId) {
    const dmKey = getDmKeyFor(currentUser.id, currentDmUserId);
    if (!data.dmMessages[dmKey]) data.dmMessages[dmKey] = [];
    data.dmMessages[dmKey].push(message);
  }
  saveData(data);

  messageInput.value = "";
  renderMessages();
});

addChannelBtn.addEventListener("click", () => {
  const name = prompt("Name des neuen Kanals (ohne #):", "neuer-kanal");
  if (!name) return;
  const clean = name.trim().toLowerCase().replace(/\s+/g, "-");
  if (!clean) return;

  const data = loadData();
  const list = data.channelsByServer[currentServerId] || [];
  if (list.some((c) => c.id === clean)) {
    alert("Es existiert bereits ein Kanal mit diesem Namen.");
    return;
  }
  const channel = { id: clean, name: clean };
  list.push(channel);
  data.channelsByServer[currentServerId] = list;
  saveData(data);

  currentChannelId = channel.id;
  currentChannelNameEl.textContent = channel.name;
  messageInput.placeholder = `Nachricht an #${channel.name} senden`;

  renderChannels();
  renderMessages();
});

serverButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.server;
    if (!id) return;
    currentServerId = id;
    serverButtons.forEach((b) => b.classList.toggle("active", b === btn));

    const data = loadData();
    const channels = data.channelsByServer[currentServerId] || [];
    if (!channels.length) {
      data.channelsByServer[currentServerId] = [...defaultChannels];
      saveData(data);
    }

    currentChannelId = data.channelsByServer[currentServerId][0].id;
    currentChannelNameEl.textContent =
      data.channelsByServer[currentServerId][0].name;
    messageInput.placeholder = `Nachricht an #${currentChannelNameEl.textContent} senden`;

    currentView = "channel";
    currentDmUserId = null;

    renderChannels();
    renderMessages();
  });
});

function initAppForUser() {
  ensureBaseStructure();
  currentServerId = "all";
  currentChannelId = "general";

  currentUserDisplayEl.textContent = currentUser
    ? `${currentUser.username} (${currentUser.email})`
    : "";

  switchToApp();
  currentView = "channel";
  currentDmUserId = null;
  contextHashEl.textContent = "#";
  setMainView("channel");
  renderChannels();
  renderMessages();
  renderFriends();
}

window.addEventListener("DOMContentLoaded", () => {
  ensureBaseStructure();
  const session = loadSession();
  if (session) {
    const users = loadUsers();
    const user = users.find((u) => u.id === session.userId);
    if (user) {
      currentUser = user;
      initAppForUser();
      return;
    }
  }
  switchToAuth();
});

