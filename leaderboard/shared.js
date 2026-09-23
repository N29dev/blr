const EVENT_START = 1789876800;
const EVENT_END = 1790438340;
const MIN_VIEWS = 5000;

function fmtNum(n) {
  return new Intl.NumberFormat("en-US").format(Number(n) || 0);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, function (ch) {
    if (ch === "&") return "&" + "amp;";
    if (ch === "<") return "&" + "lt;";
    if (ch === ">") return "&" + "gt;";
    if (ch === '"') return "&" + "quot;";
    return "&#" + "39;";
  });
}

function formatFull(unix) {
  return new Date(Number(unix) * 1000).toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function inWindow(iso, startUnix, endUnix) {
  const t = new Date(iso);
  if (isNaN(t)) return false;
  const sec = Math.floor(t.getTime() / 1000);
  return sec >= startUnix && sec <= endUnix;
}

function detectKind(url, platform) {
  const u = (url || "").toLowerCase();
  if (platform === "tiktok" || u.includes("tiktok.com")) return "tiktok";
  if (u.includes("/shorts/")) return "youtube-short";
  return "youtube-video";
}

function kindLabel(kind) {
  if (kind === "tiktok") return { text: "TikTok", cls: "tt" };
  if (kind === "youtube-short") return { text: "YT Short", cls: "yt" };
  return { text: "YT Video", cls: "yt" };
}

function tiktokUrl(handle) {
  if (!handle) return "";
  const user = handle.replace(/^@/, "").trim();
  return user ? `https://www.tiktok.com/@${user}` : "";
}

function youtubeUrl(value) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  const h = value.startsWith("@") ? value : "@" + value;
  return `https://www.youtube.com/${h}`;
}

function creatorInitial(name) {
  const t = String(name || "?").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return (t[0] || "?").toUpperCase();
}

function creatorAvatarUrl(creator) {
  if (!creator) return "";
  if (creator.avatar) return creator.avatar;
  const tt = tiktokHandle(creator.tiktok || "");
  if (tt) return "https://unavatar.io/tiktok/" + encodeURIComponent(tt);
  const yt = youtubeKey(creator.youtube || creator.channelHandle || "");
  if (yt && !yt.startsWith("uc")) return "https://unavatar.io/youtube/" + encodeURIComponent(yt);
  if (creator.youtubeChannelId) return "https://unavatar.io/youtube/" + encodeURIComponent(creator.youtubeChannelId);
  return "";
}

function avatarHtml(creator, size) {
  const cls = size === "sm" ? "pfp sm" : "pfp";
  const url = creatorAvatarUrl(creator);
  const initial = escapeHtml(creatorInitial(creator && creator.name));
  const img = url
    ? `<img class="${cls}" src="${escapeHtml(url)}" alt="" referrerpolicy="no-referrer" loading="lazy" onload="this.classList.add('on')" onerror="this.remove()">`
    : "";
  return `<span class="pfp-wrap">${img}<span class="pfp-fallback ${size === "sm" ? "sm" : ""}">${initial}</span></span>`;
}

function platformOf(video) {
  const kind = video.kind || detectKind(video.url, video.platform);
  return kind === "tiktok" ? "tiktok" : "youtube";
}

function bucketStats(list, min) {
  const views = list.reduce((s, v) => s + Number(v.views || 0), 0);
  const qual = list.filter((v) => Number(v.views) >= min);
  return { views, count: list.length, qualCount: qual.length };
}

function statsFor(creator, videos, settings) {
  const start = settings.eventStartUnix || EVENT_START;
  const end = settings.eventEndUnix || EVENT_END;
  const min = Number(settings.minViews ?? MIN_VIEWS);
  const windowed = videos.filter((v) => v.creatorId === creator.id && inWindow(v.postedAt, start, end));
  const yt = bucketStats(windowed.filter((v) => platformOf(v) === "youtube"), min);
  const tt = bucketStats(windowed.filter((v) => platformOf(v) === "tiktok"), min);
  const viewsSum = yt.views + tt.views;
  const viewsMax = Math.max(yt.views, tt.views);
  const viewsMaxPlatform = yt.views === tt.views && yt.views > 0 ? "tie" : (yt.views > tt.views ? "YouTube" : (tt.views > 0 ? "TikTok" : "-"));
  const qualSum = yt.qualCount + tt.qualCount;
  const qualMax = Math.max(yt.qualCount, tt.qualCount);
  const qualMaxPlatform = yt.qualCount === tt.qualCount && yt.qualCount > 0 ? "tie" : (yt.qualCount > tt.qualCount ? "YouTube" : (tt.qualCount > 0 ? "TikTok" : "-"));
  return {
    windowed,
    youtube: yt,
    tiktok: tt,
    views: viewsSum,
    viewsSum,
    viewsMax,
    viewsMaxPlatform,
    videoCount: windowed.length,
    qualCount: qualSum,
    qualSum,
    qualMax,
    qualMaxPlatform,
  };
}

function ranked(creators, videos, settings, key) {
  return creators
    .map((c) => ({ creator: c, stats: statsFor(c, videos, settings) }))
    .sort((a, b) => b.stats[key] - a.stats[key] || a.creator.name.localeCompare(b.creator.name));
}

function humanDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function countdownText(startUnix, endUnix) {
  const now = Date.now();
  const start = startUnix * 1000;
  const end = endUnix * 1000;
  if (now < start) return "Starts in " + humanDuration(start - now);
  if (now > end) return "Event ended";
  return "Ends in " + humanDuration(end - now);
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

function normalizeTiktok(v) {
  if (!v) return "";
  const m = String(v).trim().match(/tiktok\.com\/@([^/?]+)/i);
  if (m) return "@" + m[1];
  const t = String(v).trim().replace(/^@/, "");
  return t ? "@" + t : "";
}

function tiktokHandle(v) {
  return normalizeTiktok(v).replace(/^@/, "").toLowerCase();
}

function youtubeKey(value) {
  if (!value) return "";
  const v = String(value).trim();
  const handle = v.match(/youtube\.com\/@([^/?]+)/i);
  if (handle) return handle[1].toLowerCase();
  const chan = v.match(/youtube\.com\/channel\/(UC[\w-]+)/i);
  if (chan) return chan[1].toLowerCase();
  return v.replace(/^https?:\/\/(www\.)?youtube\.com\//i, "").replace(/^@/, "").split(/[/?]/)[0].toLowerCase();
}

function creatorIsPair(c) {
  return Boolean(c && c.youtube && c.tiktok);
}

function findCreatorHits(creators, spec) {
  const yt = youtubeKey(spec.youtube || spec.channelHandle || "");
  const ytId = spec.youtubeChannelId || spec.channelId || "";
  const tt = tiktokHandle(spec.tiktok || spec.author || "");
  return (creators || []).filter((c) => {
    if (ytId && c.youtubeChannelId && c.youtubeChannelId === ytId) return true;
    if (yt && youtubeKey(c.youtube) && youtubeKey(c.youtube) === yt) return true;
    if (tt && tiktokHandle(c.tiktok) && tiktokHandle(c.tiktok) === tt) return true;
    return false;
  });
}

function mergeCreatorsInto(state, keep, extras) {
  extras.forEach((extra) => {
    if (!extra || extra.id === keep.id) return;
    (state.videos || []).forEach((v) => {
      if (v.creatorId === extra.id) v.creatorId = keep.id;
    });
    state.creators = state.creators.filter((c) => c.id !== extra.id);
  });
  return keep;
}

function applyPair(state, pair) {
  const spec = {
    youtube: pair.youtube,
    tiktok: pair.tiktok,
    youtubeChannelId: pair.youtubeChannelId,
  };
  const hits = findCreatorHits(state.creators, spec);
  let keep;
  if (!hits.length) {
    keep = {
      id: pair.id || uid(),
      name: pair.name,
      youtube: pair.youtube || "",
      tiktok: normalizeTiktok(pair.tiktok),
      youtubeChannelId: pair.youtubeChannelId || "",
      source: "pair",
    };
    state.creators.push(keep);
  } else {
    keep = hits[0];
    keep.name = pair.name || keep.name;
    keep.youtube = pair.youtube || keep.youtube;
    keep.tiktok = normalizeTiktok(pair.tiktok) || keep.tiktok;
    keep.youtubeChannelId = pair.youtubeChannelId || keep.youtubeChannelId || "";
    keep.source = "pair";
    mergeCreatorsInto(state, keep, hits.slice(1));
  }
  return keep;
}

function applyAllPairs(state) {
  (state.pairs || []).forEach((pair) => applyPair(state, pair));
  return state;
}

const GH_OWNER = "N29dev";
const GH_REPO = "blr";
const GH_BRANCH = "main";
const GH_DATA_BRANCH = "board-data";

async function fetchGithubJson(path, timeoutMs) {
  const url = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_DATA_BRANCH}/${path}?_=${Date.now()}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 4000);
  try {
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (!res.ok) throw new Error("GitHub raw " + res.status + " for " + path);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLocalJson(path) {
  const res = await fetch(path + "?t=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load " + path);
  return res.json();
}

function normalizeBoard(data, pairsDoc, source) {
  data.settings = {
    eventStartUnix: EVENT_START,
    eventEndUnix: EVENT_END,
    minViews: MIN_VIEWS,
    ...(data.settings || {}),
  };
  data.creators = data.creators || [];
  data.videos = data.videos || [];
  data.pairs = (pairsDoc && pairsDoc.pairs) || data.pairs || [];
  data._source = source;
  applyAllPairs(data);
  return data;
}

async function loadPagesBoard() {
  const data = await fetchLocalJson("data.json");
  let pairsDoc = { pairs: data.pairs || [] };
  try { pairsDoc = await fetchLocalJson("pairs.json"); } catch {}
  return normalizeBoard(data, pairsDoc, "pages");
}

async function loadGithubBoard() {
  const [liveData, livePairs] = await Promise.all([
    fetchGithubJson("leaderboard/data.json", 4000),
    fetchGithubJson("leaderboard/pairs.json", 4000).catch(() => ({ pairs: [] })),
  ]);
  return normalizeBoard(liveData, livePairs, "github");
}

async function loadBoardData() {
  try {
    return await loadGithubBoard();
  } catch (err) {
    return loadPagesBoard();
  }
}
