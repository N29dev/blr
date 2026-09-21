function ytKey() {
  return (document.getElementById("ytKey")?.value || localStorage.getItem("cc-yt-key") || "").trim();
}

function toLocalInput(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseISODuration(iso) {
  const m = String(iso || "").match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

function extractUrls(text) {
  const found = String(text || "").match(/https?:\/\/[^\s<>"']+/gi) || [];
  return [...new Set(found.map((u) => u.replace(/[),.;]+$/, "")))];
}

function extractYouTubeId(url) {
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{11})/i);
  return m ? m[1] : null;
}

function youtubeHandleFrom(value) {
  if (!value) return "";
  const v = value.trim();
  const handle = v.match(/youtube\.com\/@([^/?]+)/i);
  if (handle) return handle[1];
  const chan = v.match(/youtube\.com\/channel\/(UC[\w-]+)/i);
  if (chan) return chan[1];
  return v.replace(/^https?:\/\/(www\.)?youtube\.com\//i, "").replace(/^@/, "").split(/[/?]/)[0];
}

async function ytGet(path, params) {
  const key = ytKey();
  if (!key) throw new Error("Add a YouTube Data API key first.");
  const url = new URL("https://www.googleapis.com/youtube/v3/" + path);
  Object.entries(params).forEach(([k, val]) => { if (val) url.searchParams.set(k, val); });
  url.searchParams.set("key", key);
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || ("YouTube " + res.status));
  return data;
}

async function resolveChannel(input) {
  const raw = youtubeHandleFrom(input);
  if (!raw) throw new Error("No YouTube handle/channel.");
  if (raw.startsWith("UC") && raw.length >= 20) {
    const data = await ytGet("channels", { part: "contentDetails,snippet", id: raw });
    if (!data.items?.[0]) throw new Error("YouTube channel not found.");
    return data.items[0];
  }
  const byHandle = await ytGet("channels", { part: "contentDetails,snippet", forHandle: raw });
  if (byHandle.items?.[0]) return byHandle.items[0];
  const byUser = await ytGet("channels", { part: "contentDetails,snippet", forUsername: raw });
  if (byUser.items?.[0]) return byUser.items[0];
  throw new Error("Could not resolve @" + raw);
}

async function listUploads(uploadsId, stopUnix) {
  const ids = [];
  let page = "";
  for (let i = 0; i < 8; i += 1) {
    const data = await ytGet("playlistItems", {
      part: "contentDetails,snippet",
      playlistId: uploadsId,
      maxResults: "50",
      pageToken: page,
    });
    for (const item of data.items || []) {
      const published = Date.parse(item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || 0);
      if (!published) continue;
      if (published / 1000 < stopUnix - 86400) return ids;
      ids.push(item.contentDetails.videoId);
    }
    page = data.nextPageToken;
    if (!page) break;
  }
  return ids;
}

async function ytVideoDetails(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const data = await ytGet("videos", { part: "snippet,statistics,contentDetails", id: chunk.join(",") });
    for (const item of data.items || []) {
      const secs = parseISODuration(item.contentDetails?.duration);
      const published = item.snippet.publishedAt;
      out.push({
        videoId: item.id,
        title: item.snippet.title,
        url: secs <= 60 ? `https://www.youtube.com/shorts/${item.id}` : `https://www.youtube.com/watch?v=${item.id}`,
        views: Number(item.statistics.viewCount || 0),
        postedAt: toLocalInput(published),
        postedUnix: Math.floor(Date.parse(published) / 1000),
        kind: secs <= 60 ? "youtube-short" : "youtube-video",
        platform: "youtube",
      });
    }
  }
  return out;
}

async function parseYouTubeChannel(channelValue) {
  const channel = await resolveChannel(channelValue);
  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error("No uploads playlist.");
  const ids = await listUploads(uploads, EVENT_START);
  return ytVideoDetails(ids);
}

async function parseYouTubeUrls(urls) {
  const ids = urls.map(extractYouTubeId).filter(Boolean);
  if (!ids.length) return [];
  return ytVideoDetails([...new Set(ids)]);
}

async function parseTikTokUrl(url) {
  const endpoints = [
    "https://www.tikwm.com/api/?url=" + encodeURIComponent(url),
    "https://tikwm.com/api/?url=" + encodeURIComponent(url),
  ];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) continue;
      const data = await res.json();
      const d = data.data;
      if (!d) continue;
      const created = Number(d.create_time || 0);
      return {
        title: d.title || d.id || "TikTok",
        url,
        views: Number(d.play_count || d.playCount || 0),
        postedAt: created ? toLocalInput(new Date(created * 1000)) : "",
        postedUnix: created || 0,
        kind: "tiktok",
        platform: "tiktok",
      };
    } catch {}
  }
  return null;
}

async function parseTikTokProfile(uniqueId) {
  const user = String(uniqueId || "").replace(/^@/, "");
  const endpoints = [
    `https://www.tikwm.com/api/user/posts?unique_id=${encodeURIComponent(user)}&count=30`,
    `https://tikwm.com/api/user/posts?unique_id=${encodeURIComponent(user)}&count=30`,
  ];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) continue;
      const data = await res.json();
      const videos = data.data?.videos || data.data || [];
      if (!Array.isArray(videos) || !videos.length) continue;
      return videos.map((v) => {
        const created = Number(v.create_time || 0);
        const id = v.video_id || v.id;
        return {
          title: v.title || id,
          url: `https://www.tiktok.com/@${user}/video/${id}`,
          views: Number(v.play_count || 0),
          postedAt: created ? toLocalInput(new Date(created * 1000)) : "",
          postedUnix: created || 0,
          kind: "tiktok",
          platform: "tiktok",
        };
      });
    } catch {}
  }
  return null;
}

function inEvent(item, windowOnly) {
  if (!windowOnly) return true;
  if (!item.postedUnix) return true;
  return item.postedUnix >= EVENT_START && item.postedUnix <= EVENT_END;
}

function upsertVideos(creatorId, items) {
  let added = 0;
  let updated = 0;
  items.forEach((item) => {
    const existing = state.videos.find((v) => v.creatorId === creatorId && v.url === item.url);
    if (existing) {
      existing.views = item.views;
      existing.title = item.title || existing.title;
      existing.postedAt = item.postedAt || existing.postedAt;
      existing.kind = item.kind;
      existing.platform = item.platform;
      updated += 1;
    } else {
      state.videos.push({
        id: uid(),
        creatorId,
        url: item.url,
        title: item.title || "",
        postedAt: item.postedAt,
        views: item.views,
        kind: item.kind,
        platform: item.platform,
      });
      added += 1;
    }
  });
  return { added, updated };
}

function setParseStatus(text) {
  const el = document.getElementById("parseStatus");
  if (el) el.textContent = text;
}

async function syncCreator(creator, windowOnly) {
  const found = [];
  const notes = [];
  if (creator.youtube) {
    try {
      const vids = await parseYouTubeChannel(creator.youtube);
      found.push(...vids.filter((v) => inEvent(v, windowOnly)));
      notes.push(`YouTube ${vids.length} scanned`);
    } catch (err) {
      notes.push("YouTube: " + err.message);
    }
  }
  if (creator.tiktok) {
    const profile = await parseTikTokProfile(creator.tiktok);
    if (profile) {
      found.push(...profile.filter((v) => inEvent(v, windowOnly)));
      notes.push(`TikTok ${profile.length} scanned`);
    } else {
      notes.push("TikTok profile blocked — paste video links instead");
    }
  }
  return { found, notes };
}
