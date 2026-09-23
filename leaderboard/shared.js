const EVENT_START = 1789862400;
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
  let raw = String(iso || "").trim().replace(" ", "T");
  if (!raw) return false;
  if (!/[zZ]|[+\-]\d{2}:\d{2}$/.test(raw)) raw += "Z";
  const t = new Date(raw);
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
    ...(data.settings || {}),
    eventStartUnix: EVENT_START,
    eventEndUnix: EVENT_END,
    minViews: MIN_VIEWS,
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

function boardVideoKey(v) {
  const u = String((v && v.url) || "").split("?")[0];
  const tt = u.match(/\/video\/(\d+)/);
  if (tt) return "tt:" + tt[1];
  const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:shorts\/|embed\/|watch\?v=))([\w-]{11})/i);
  if (yt) return "yt:" + yt[1];
  return "url:" + u.toLowerCase();
}

function mergeCreatorRecord(keep, extra) {
  if (!keep) return extra;
  if (!extra) return keep;
  keep.name = keep.name || extra.name;
  keep.youtube = keep.youtube || extra.youtube || "";
  keep.tiktok = keep.tiktok || extra.tiktok || "";
  keep.youtubeChannelId = keep.youtubeChannelId || extra.youtubeChannelId || "";
  keep.avatar = keep.avatar || extra.avatar || "";
  if (keep.source === "pair" || extra.source === "pair") keep.source = "pair";
  else keep.source = keep.source || extra.source || "auto";
  return keep;
}

function mergeBoards(live, local, opts) {
  opts = opts || {};
  const deletedCreators = new Set(opts.deletedCreators || []);
  const deletedVideos = new Set(opts.deletedVideos || []);
  const creators = [];
  function addCreator(c) {
    if (!c || deletedCreators.has(c.id)) return;
    const hits = findCreatorHits(creators, c);
    if (hits.length) mergeCreatorRecord(hits[0], c);
    else creators.push(Object.assign({}, c));
  }
  (live.creators || []).forEach(addCreator);
  (local.creators || []).forEach(addCreator);
  function resolveCreatorId(video) {
    if (!video) return "";
    const owner = (live.creators || []).concat(local.creators || []).find((c) => c.id === video.creatorId);
    if (owner) {
      const hits = findCreatorHits(creators, owner);
      if (hits.length) return hits[0].id;
    }
    if (creators.some((c) => c.id === video.creatorId)) return video.creatorId;
    return video.creatorId;
  }
  const videos = [];
  const seen = new Map();
  function addVideo(v) {
    if (!v) return;
    const key = boardVideoKey(v);
    if (!key || deletedVideos.has(v.id) || deletedVideos.has(key)) return;
    const copy = Object.assign({}, v, { creatorId: resolveCreatorId(v) });
    const existing = seen.get(key);
    if (existing) {
      if (Number(copy.views || 0) > Number(existing.views || 0)) existing.views = copy.views;
      existing.title = existing.title || copy.title;
      existing.postedAt = existing.postedAt || copy.postedAt;
      existing.url = existing.url || copy.url;
      existing.kind = existing.kind || copy.kind;
      existing.platform = existing.platform || copy.platform;
    } else {
      seen.set(key, copy);
      videos.push(copy);
    }
  }
  (live.videos || []).forEach(addVideo);
  (local.videos || []).forEach(addVideo);
  const pairMap = new Map();
  [].concat(live.pairs || [], local.pairs || []).forEach((p) => {
    if (!p) return;
    const k = (p.id || "") + "|" + youtubeKey(p.youtube || "") + "|" + tiktokHandle(p.tiktok || "");
    pairMap.set(k, Object.assign({}, pairMap.get(k) || {}, p));
  });
  return {
    settings: {
      eventStartUnix: EVENT_START,
      eventEndUnix: EVENT_END,
      minViews: MIN_VIEWS,
      updatedAt: new Date().toISOString(),
    },
    creators: creators,
    videos: videos,
    pairs: Array.from(pairMap.values()),
  };
}
