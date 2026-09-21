const EVENT_START = 1789876800;
const EVENT_END = 1790438340;
const MIN_VIEWS = 5000;

function fmtNum(n) {
  return new Intl.NumberFormat("en-US").format(Number(n) || 0);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
  const viewsMaxPlatform = yt.views === tt.views && yt.views > 0 ? "tie" : (yt.views > tt.views ? "YouTube" : (tt.views > 0 ? "TikTok" : "—"));
  const qualSum = yt.qualCount + tt.qualCount;
  const qualMax = Math.max(yt.qualCount, tt.qualCount);
  const qualMaxPlatform = yt.qualCount === tt.qualCount && yt.qualCount > 0 ? "tie" : (yt.qualCount > tt.qualCount ? "YouTube" : (tt.qualCount > 0 ? "TikTok" : "—"));
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

async function loadBoardData() {
  const res = await fetch("data.json?t=" + Date.now(), { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load data.json");
  const data = await res.json();
  data.settings = {
    eventStartUnix: EVENT_START,
    eventEndUnix: EVENT_END,
    minViews: MIN_VIEWS,
    ...(data.settings || {}),
  };
  data.creators = data.creators || [];
  data.videos = data.videos || [];
  return data;
}
