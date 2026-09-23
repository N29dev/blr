const PASS_HASH = "7688c2ddeb19cb668212624c0a17a17b16a5108f55bb73ed309d3e16df5e6bf0";
const GH_OWNER = "N29dev";
const GH_REPO = "blr";
const GH_PATH = "leaderboard/data.json";
const GH_BRANCH = "main";

let state = { settings: { eventStartUnix: EVENT_START, eventEndUnix: EVENT_END, minViews: MIN_VIEWS }, creators: [], videos: [], pairs: [] };
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
    pairs: state.pairs || [],
  };
}

function pairsPayload() {
  return { pairs: state.pairs || [] };
}

function rowButtons(c) {
  return `<div class="row">
        <button class="btn" data-sync="${c.id}">Sync</button>
        <button class="btn" data-edit="${c.id}">Edit</button>
        <button class="btn danger" data-del="${c.id}">Delete</button>
      </div>`;
}

function renderAdmin() {
  const pairs = (state.creators || []).filter((c) => c.source === "pair" || (c.youtube && c.tiktok));
  const autos = (state.creators || []).filter((c) => !pairs.some((p) => p.id === c.id));
  const pairList = document.getElementById("pairList");
  if (pairList) {
    pairList.innerHTML = pairs.map((c) => `
    <div class="creator-row">
      <div>
        <strong>${escapeHtml(c.name)}</strong> <span class="pill ok">YT+TT</span><br>
        <small>${escapeHtml(c.youtube || "no YouTube")} · ${escapeHtml(c.tiktok || "no TikTok")}</small>
      </div>
      ${rowButtons(c)}
    </div>`).join("") || `<p class="empty">No official pairs yet. Add people who have both accounts.</p>`;
  }
  const list = document.getElementById("creatorList");
  list.innerHTML = autos.map((c) => `
    <div class="creator-row">
      <div>
        <strong>${escapeHtml(c.name)}</strong> <span class="pill">${escapeHtml(c.source || "auto")}</span><br>
        <small>${escapeHtml(c.youtube || "no YouTube")} · ${escapeHtml(c.tiktok || "no TikTok")}</small>
      </div>
      ${rowButtons(c)}
    </div>
  `).join("") || `<p class="empty">No auto-detected creators yet. Paste video links.</p>`;

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
  const yt = localStorage.getItem("cc-yt-key");
  if (yt) document.getElementById("ytKey").value = yt;
  try { await loadLive(); } catch { renderAdmin(); }
});

document.getElementById("ytKey").addEventListener("change", () => {
  localStorage.setItem("cc-yt-key", document.getElementById("ytKey").value.trim());
});

document.getElementById("creatorForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  const row = {
    id: editingCreatorId || uid(),
    name: form.name.value.trim(),
    youtube: form.youtube.value.trim(),
    tiktok: normalizeTiktok(form.tiktok.value),
  };
  state.pairs = state.pairs || [];
  const existingPair = state.pairs.findIndex((p) => p.id === row.id || (p.name === row.name && p.youtube === row.youtube));
  if (existingPair >= 0) state.pairs[existingPair] = { ...state.pairs[existingPair], ...row };
  else state.pairs.push(row);
  const saved = applyPair(state, row);
  editingCreatorId = null;
  form.reset();
  renderAdmin();
  if (document.getElementById("autoSyncOnSave") && document.getElementById("autoSyncOnSave").checked && saved) {
    setParseStatus("Auto-sync " + saved.name + "…");
    const windowOnly = !document.getElementById("parseWindowOnly") || document.getElementById("parseWindowOnly").checked;
    syncCreator(saved, windowOnly).then((res) => {
      const r = upsertVideos(saved.id, res.found);
      renderAdmin();
      setParseStatus(saved.name + ": +" + r.added + " new, " + r.updated + " updated. " + res.notes.join(" · "), true);
    }).catch((err) => setParseStatus(String(err.message || err), true));
  }
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
  const sync = e.target.closest("[data-sync]");
  const edit = e.target.closest("[data-edit]");
  const del = e.target.closest("[data-del]");
  const delV = e.target.closest("[data-del-video]");
  if (sync) {
    const creator = state.creators.find((x) => x.id === sync.dataset.sync);
    if (!creator) return;
    setParseStatus("Syncing " + creator.name + "…");
    syncCreator(creator, document.getElementById("parseWindowOnly").checked)
      .then((res) => {
        const r = upsertVideos(creator.id, res.found);
        renderAdmin();
        setParseStatus(`${creator.name}: +${r.added} new, ${r.updated} updated. ${res.notes.join(" · ")}`);
      })
      .catch((err) => setParseStatus(String(err.message || err)));
  }
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
    const gone = state.creators.find((c) => c.id === id);
    state.creators = state.creators.filter((c) => c.id !== id);
    state.videos = state.videos.filter((v) => v.creatorId !== id);
    state.pairs = (state.pairs || []).filter((p) => p.id !== id && !(gone && p.name === gone.name && p.youtube === gone.youtube));
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

document.getElementById("parseLinksBtn").addEventListener("click", async () => {
  const blob = document.getElementById("parsePaste").value;
  const creatorId = document.querySelector("#videoForm [name=creatorId]")?.value || "";
  if (!document.getElementById("parsePaste").value.trim()) {
    setParseStatus("Paste video or channel links first.");
    return;
  }
  const windowOnly = document.getElementById("parseWindowOnly").checked;
  setParseStatus("Auto-parsing pasted links…");
  try {
    const summary = await parseMixedText(blob, creatorId, windowOnly);
    renderAdmin();
    const extra = summary.notes.length ? "\n" + summary.notes.join("\n") : "";
    setParseStatus(
      "Parsed " + summary.urls + " links → +" + summary.added + " new, " +
      summary.updated + " updated, " + summary.skipped + " skipped." + extra
    );
  } catch (err) {
    setParseStatus(String(err.message || err));
  }
});

document.getElementById("syncAllBtn").addEventListener("click", async () => {
  if (!state.creators.length) {
    setParseStatus("Add creators first.");
    return;
  }
  const windowOnly = document.getElementById("parseWindowOnly").checked;
  const lines = [];
  for (const creator of state.creators) {
    setParseStatus("Syncing " + creator.name + "…");
    try {
      const res = await syncCreator(creator, windowOnly);
      const r = upsertVideos(creator.id, res.found);
      lines.push(`${creator.name}: +${r.added}/${r.updated} · ${res.notes.join(", ")}`);
    } catch (err) {
      lines.push(creator.name + ": " + (err.message || err));
    }
  }
  renderAdmin();
  setParseStatus(lines.join(" | "));
});

document.getElementById("refreshViewsBtn").addEventListener("click", async () => {
  const ytUrls = state.videos.filter((v) => v.platform !== "tiktok").map((v) => v.url);
  const ttVids = state.videos.filter((v) => v.platform === "tiktok" || detectKind(v.url) === "tiktok");
  setParseStatus("Refreshing views…");
  try {
    if (ytUrls.length) {
      const fresh = await parseYouTubeUrls(ytUrls);
      fresh.forEach((item) => {
        const hit = state.videos.find((v) => extractYouTubeId(v.url) === extractYouTubeId(item.url));
        if (hit) hit.views = item.views;
      });
    }
    for (const v of ttVids) {
      const item = await parseTikTokUrl(v.url);
      if (item) v.views = item.views;
    }
    renderAdmin();
    setParseStatus("Views refreshed. Publish to push the public board.");
  } catch (err) {
    setParseStatus(String(err.message || err));
  }
});

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
    async function putGithub(path, obj, message) {
      const getUrl = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}?ref=${GH_BRANCH}`;
      const current = await fetch(getUrl, { headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" } });
      const currentJson = await current.json();
      const sha = currentJson.sha;
      const body = JSON.stringify({
        message,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(obj, null, 2)))),
        sha,
        branch: GH_BRANCH,
      });
      const put = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${path}`, {
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
        throw new Error((err.message || ("GitHub " + put.status)) + " (" + path + ")");
      }
    }
    await putGithub(GH_PATH, payload(), "Update CC leaderboard data");
    await putGithub("leaderboard/pairs.json", pairsPayload(), "Update CC official pairs");
    status.textContent = "Published data.json + pairs.json. Public page updates in about a minute.";
  } catch (err) {
    status.textContent = "Publish failed: " + (err.message || err);
  }
});
