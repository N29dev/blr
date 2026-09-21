const PASS_HASH = "7688c2ddeb19cb668212624c0a17a17b16a5108f55bb73ed309d3e16df5e6bf0";
const GH_OWNER = "N29dev";
const GH_REPO = "blr";
const GH_PATH = "leaderboard/data.json";
const GH_BRANCH = "main";

let state = { settings: { eventStartUnix: EVENT_START, eventEndUnix: EVENT_END, minViews: MIN_VIEWS }, creators: [], videos: [] };
let editingCreatorId = null;

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

function normalizeTiktok(v) {
  if (!v) return "";
  const m = v.trim().match(/tiktok\.com\/@([^/?]+)/i);
  if (m) return "@" + m[1];
  const t = v.trim().replace(/^@/, "");
  return t ? "@" + t : "";
}

async function loadLive() {
  state = await loadBoardData();
  renderAdmin();
}

function payload() {
  return {
    settings: {
      eventStartUnix: EVENT_START,
      eventEndUnix: EVENT_END,
      minViews: MIN_VIEWS,
      updatedAt: new Date().toISOString(),
    },
    creators: state.creators,
    videos: state.videos,
  };
}

function renderAdmin() {
  const list = document.getElementById("creatorList");
  list.innerHTML = state.creators.map((c) => `
    <div class="creator-row">
      <div>
        <strong>${escapeHtml(c.name)}</strong><br>
        <small>${escapeHtml(c.youtube || "no YouTube")} · ${escapeHtml(c.tiktok || "no TikTok")}</small>
      </div>
      <div class="row">
        <button class="btn" data-edit="${c.id}">Edit</button>
        <button class="btn danger" data-del="${c.id}">Delete</button>
      </div>
    </div>
  `).join("") || `<p class="empty">No creators yet.</p>`;

  const sel = document.querySelector("#videoForm [name=creatorId]");
  sel.innerHTML = state.creators.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");

  document.getElementById("adminVideos").innerHTML = state.videos
    .slice()
    .sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt)))
    .map((v) => {
      const c = state.creators.find((x) => x.id === v.creatorId);
      const kind = kindLabel(v.kind || detectKind(v.url, v.platform));
      return `<tr>
        <td>${escapeHtml((v.postedAt || "").replace("T", " "))}</td>
        <td>${escapeHtml(c?.name || "—")}</td>
        <td><span class="pill ${kind.cls}">${kind.text}</span></td>
        <td class="metric">${fmtNum(v.views)}</td>
        <td><button class="btn danger" data-del-video="${v.id}">✕</button></td>
      </tr>`;
    }).join("");
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const hash = await sha256(document.getElementById("password").value);
  if (hash !== PASS_HASH) {
    document.getElementById("loginError").textContent = "Wrong password.";
    return;
  }
  document.getElementById("loginCard").hidden = true;
  document.getElementById("app").hidden = false;
  const saved = localStorage.getItem("cc-gh-token");
  if (saved) document.getElementById("ghToken").value = saved;
  try { await loadLive(); } catch { renderAdmin(); }
});

document.getElementById("creatorForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  const row = {
    name: form.name.value.trim(),
    youtube: form.youtube.value.trim(),
    tiktok: normalizeTiktok(form.tiktok.value),
  };
  if (editingCreatorId) {
    const i = state.creators.findIndex((c) => c.id === editingCreatorId);
    if (i >= 0) state.creators[i] = { ...state.creators[i], ...row };
  } else {
    state.creators.push({ id: uid(), ...row });
  }
  editingCreatorId = null;
  form.reset();
  renderAdmin();
});

document.getElementById("resetCreator").addEventListener("click", () => {
  editingCreatorId = null;
  document.getElementById("creatorForm").reset();
});

document.getElementById("videoForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  const url = form.url.value.trim();
  const kind = detectKind(url);
  state.videos.push({
    id: uid(),
    creatorId: form.creatorId.value,
    url,
    title: form.title.value.trim(),
    postedAt: form.postedAt.value,
    views: Number(form.views.value || 0),
    kind,
    platform: kind === "tiktok" ? "tiktok" : "youtube",
  });
  form.title.value = "";
  form.url.value = "";
  form.views.value = "0";
  renderAdmin();
});

document.getElementById("videoForm").url.addEventListener("input", (e) => {
  const kind = kindLabel(detectKind(e.target.value));
  document.getElementById("kindHint").textContent = "Detected: " + kind.text + " — both YouTube videos and Shorts count.";
});

document.addEventListener("click", (e) => {
  const edit = e.target.closest("[data-edit]");
  const del = e.target.closest("[data-del]");
  const delV = e.target.closest("[data-del-video]");
  if (edit) {
    const c = state.creators.find((x) => x.id === edit.dataset.edit);
    if (!c) return;
    editingCreatorId = c.id;
    const form = document.getElementById("creatorForm");
    form.name.value = c.name;
    form.youtube.value = c.youtube || "";
    form.tiktok.value = c.tiktok || "";
  }
  if (del) {
    const id = del.dataset.del;
    state.creators = state.creators.filter((c) => c.id !== id);
    state.videos = state.videos.filter((v) => v.creatorId !== id);
    renderAdmin();
  }
  if (delV) {
    state.videos = state.videos.filter((v) => v.id !== delV.dataset.delVideo);
    renderAdmin();
  }
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(payload(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data.json";
  a.click();
});

document.getElementById("reloadBtn").addEventListener("click", () => loadLive().catch((err) => {
  document.getElementById("publishStatus").textContent = String(err.message || err);
}));

document.getElementById("publishBtn").addEventListener("click", async () => {
  const token = document.getElementById("ghToken").value.trim();
  const status = document.getElementById("publishStatus");
  if (!token) {
    status.textContent = "Add a GitHub token first, or download JSON.";
    return;
  }
  localStorage.setItem("cc-gh-token", token);
  status.textContent = "Publishing…";
  try {
    const getUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH}?ref=${GH_BRANCH}`;
    const current = await fetch(getUrl, { headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" } });
    const currentJson = await current.json();
    const sha = currentJson.sha;
    const body = JSON.stringify({
      message: "Update CC leaderboard data",
      content: btoa(unescape(encodeURIComponent(JSON.stringify(payload(), null, 2)))),
      sha,
      branch: GH_BRANCH,
    });
    const put = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${GH_PATH}`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body,
    });
    if (!put.ok) {
      const err = await put.json().catch(() => ({}));
      throw new Error(err.message || ("GitHub " + put.status));
    }
    status.textContent = "Published. Public page updates in about a minute.";
  } catch (err) {
    status.textContent = "Publish failed: " + (err.message || err);
  }
});
