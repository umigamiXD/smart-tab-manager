const sessionsDiv = document.getElementById("sessions");
const inactiveInput = document.getElementById("inactiveTime");

// Save current window tabs as a session
document.getElementById("saveSession").addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const urls = tabs.map(t => ({ title: t.title, url: t.url }));
  const timestamp = new Date().toLocaleString();
  const session = { name: `Session - ${timestamp}`, urls };

  const result = await chrome.storage.local.get("sessions");
  const sessions = result.sessions || [];
  sessions.push(session);
  await chrome.storage.local.set({ sessions });

  loadSessions();
});

// Load sessions (same as v1.1)
async function loadSessions() {
  sessionsDiv.innerHTML = "";
  const { sessions } = await chrome.storage.local.get("sessions");
  if (!sessions || sessions.length === 0) {
    sessionsDiv.innerHTML = "<p>No saved sessions yet.</p>";
    return;
  }

  sessions.forEach((s, i) => {
    const sessionDiv = document.createElement("div");
    sessionDiv.className = "session";

    const nameDiv = document.createElement("div");
    nameDiv.className = "session-name";
    nameDiv.textContent = s.name;
    sessionDiv.appendChild(nameDiv);

    const buttonDiv = document.createElement("div");
    buttonDiv.className = "session-buttons";
    buttonDiv.innerHTML = `
      <button class="toggle-btn" data-index="${i}">▼</button>
      <button data-index="${i}" class="restore">Restore</button>
      <button data-index="${i}" class="rename">Rename</button>
      <button data-index="${i}" class="delete">Delete</button>
    `;
    sessionDiv.appendChild(buttonDiv);

    const tabList = document.createElement("div");
    tabList.className = "tab-list";

    s.urls.forEach((tab, tIndex) => {
      const tabDiv = document.createElement("div");
      tabDiv.className = "tab-item";

      const tabLink = document.createElement("a");
      tabLink.href = tab.url;
      tabLink.target = "_blank";
      tabLink.title = tab.url;
      tabLink.textContent = tab.title || tab.url;

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-tab";
      deleteBtn.dataset.session = i;
      deleteBtn.dataset.tab = tIndex;
      deleteBtn.textContent = "✖";

      tabDiv.appendChild(tabLink);
      tabDiv.appendChild(deleteBtn);
      tabList.appendChild(tabDiv);
    });

    sessionDiv.appendChild(tabList);
    sessionsDiv.appendChild(sessionDiv);
  });

  // Toggle dropdown
  document.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      const sessionDiv = e.target.closest(".session");
      const tabList = sessionDiv.querySelector(".tab-list");
      const expanded = tabList.style.display === "flex";
      tabList.style.display = expanded ? "none" : "flex";
      e.target.textContent = expanded ? "▼" : "▲";
    });
  });

  // Restore, delete, rename, delete individual tab (same as v1.1)
  document.querySelectorAll(".restore").forEach(btn => {
    btn.addEventListener("click", async e => {
      const i = e.target.dataset.index;
      const { sessions } = await chrome.storage.local.get("sessions");
      sessions[i].urls.forEach(tab => chrome.tabs.create({ url: tab.url }));
    });
  });

  document.querySelectorAll(".delete").forEach(btn => {
    btn.addEventListener("click", async e => {
      const i = e.target.dataset.index;
      const { sessions } = await chrome.storage.local.get("sessions");
      sessions.splice(i, 1);
      await chrome.storage.local.set({ sessions });
      loadSessions();
    });
  });

  document.querySelectorAll(".rename").forEach(btn => {
    btn.addEventListener("click", async e => {
      const i = e.target.dataset.index;
      const { sessions } = await chrome.storage.local.get("sessions");
      const newName = prompt("Enter a new name:", sessions[i].name);
      if (newName && newName.trim() !== "") {
        sessions[i].name = newName.trim();
        await chrome.storage.local.set({ sessions });
        loadSessions();
      }
    });
  });

  document.querySelectorAll(".delete-tab").forEach(btn => {
    btn.addEventListener("click", async e => {
      const sIndex = parseInt(e.target.dataset.session);
      const tIndex = parseInt(e.target.dataset.tab);
      const { sessions } = await chrome.storage.local.get("sessions");
      sessions[sIndex].urls.splice(tIndex, 1);
      await chrome.storage.local.set({ sessions });
      e.target.closest(".tab-item").remove();
    });
  });
}

// Close inactive tabs based on user-set threshold
document.getElementById("cleanTabs").addEventListener("click", async () => {
  const minutes = parseInt(inactiveInput.value);
  if (isNaN(minutes) || minutes <= 0) {
    alert("Please enter a valid number of minutes.");
    return;
  }
  const threshold = minutes * 60 * 1000; // convert minutes to ms

  chrome.runtime.sendMessage({ action: "getIdleTabs", threshold }, response => {
    const idleTabs = response.idleTabs;
    idleTabs.forEach(tab => chrome.tabs.remove(tab.id));
    alert(`Closed ${idleTabs.length} inactive tab(s)`);
  });
});

loadSessions();
