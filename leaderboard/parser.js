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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractUrls(text) {
  const found = String(text || "").match(/https?:\/\/[^\s<>"'\]\)]+/gi) || [];
  return [...new Set(found.map((u) => u.replace(/[),.;]+$/, "")))];
}

function extractYouTubeId(url) {
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/|v\/))([A-Za-z0-9_-]{11})/i);
  return m ? m[1] : null;
}

function extractTikTokId(url) {
  const m = String(url).match(/\/video\/(\d{15,})|\/v\/(\d{15,})/);
  return m ? (m[1] || m[2] || null) : null;
}

function extractTikTokUser(value) {
  if (!value) return "";
  const m = String(value).match(/tiktok\.com\/@([^/?]+)/i);
  if (m) return m[1].replace(/^@/, "");
  return String(value).trim().replace(/^@/, "").split(/[/?]/)[0];
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

function isYouTubeChannelUrl(url) {
  return /youtube\.com\/(@|channel\/|c\/|user\/)/i.test(url) && !extractYouTubeId(url);
}

function isTikTokProfileUrl(url) {
  return /tiktok\.com\/@[^/?]+/i.test(url) && !/\/video\//i.test(url);
}

function videoKey(item) {
  const yid = extractYouTubeId(item.url || "");
  if (yid) return "yt:" + yid;
  const tid = extractTikTokId(item.url || "");
  if (tid) return "tt:" + tid;
  return "url:" + String(item.url || "").split("?")[0];
}

async function fetchTextViaProxy(url) {
  const proxy = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
  const res = await fetch(proxy);
  if (!res.ok) throw new Error("Proxy " + res.status);
  return res.text();
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

async function resolveChannelIdNoKey(input) {
  const raw = youtubeHandleFrom(input);
  if (raw.startsWith("UC") && raw.length >= 20) return raw;
  const pageUrl = "https://www.youtube.com/@" + raw;
  const html = await fetchTextViaProxy(pageUrl);
  const m = html.match(/"channelId":"(UC[\w-]{20,})"/) || html.match(/\/channel\/(UC[\w-]{20,})/);
  if (!m) throw new Error("Could not resolve YouTube @" + raw + " without an API key.");
  return m[1];
}

async function resolveChannel(input) {
  const raw = youtubeHandleFrom(input);
  if (!raw) throw new Error("No YouTube handle/channel.");
  if (ytKey()) {
    if (raw.startsWith("UC") && raw.length >= 20) {
      const data = await ytGet("channels", { part: "contentDetails,snippet", id: raw });
      if (!data.items?.[0]) throw new Error("YouTube channel not found.");
      return data.items[0];
    }
    const byHandle = await ytGet("channels", { part: "contentDetails,snippet", forHandle: raw });
    if (byHandle.items?.[0]) return byHandle.items[0];
    const byUser = await ytGet("channels", { part: "contentDetails,snippet", forUsername: raw });
    if (byUser.items?.[0]) return byUser.items[0];
  }
  const channelId = await resolveChannelIdNoKey(input);
  return {
    id: channelId,
    snippet: { title: raw, customUrl: raw.startsWith("UC") ? "" : "@" + raw },
    contentDetails: { relatedPlaylists: { uploads: channelId.replace(/^UC/, "UU") } },
    _nokey: true,
  };
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

async function listUploadsRss(channelId) {
  const rss = "https://www.youtube.com/feeds/videos.xml?channel_id=" + encodeURIComponent(channelId);
  const xml = await fetchTextViaProxy(rss);
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
  return entries.map((block) => {
    const id = (block[1].match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const title = (block[1].match(/<title>([^<]+)<\/title>/) || [])[1] || id;
    const published = (block[1].match(/<published>([^<]+)<\/published>/) || [])[1];
    const unix = published ? Math.floor(Date.parse(published) / 1000) : 0;
    return {
      videoId: id,
      title,
      url: "https://www.youtube.com/watch?v=" + id,
      views: 0,
      postedAt: published ? toLocalInput(published) : "",
      postedUnix: unix,
      kind: "youtube-video",
      platform: "youtube",
      channelId,
    };
  }).filter((v) => v.videoId);
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
        url: secs <= 60 ? "https://www.youtube.com/shorts/" + item.id : "https://www.youtube.com/watch?v=" + item.id,
        views: Number(item.statistics.viewCount || 0),
        postedAt: toLocalInput(published),
        postedUnix: Math.floor(Date.parse(published) / 1000),
        kind: secs <= 60 ? "youtube-short" : "youtube-video",
        platform: "youtube",
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
      });
    }
  }
  return out;
}

async function parseYouTubeChannel(channelValue) {
  const channel = await resolveChannel(channelValue);
  if (channel._nokey) return listUploadsRss(channel.id);
  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error("No uploads playlist.");
  const ids = await listUploads(uploads, EVENT_START);
  const details = await ytVideoDetails(ids);
  details.forEach((v) => {
    v.channelId = channel.id;
    v.channelTitle = channel.snippet?.title;
  });
  return details;
}

async function parseYouTubeUrls(urls) {
  const ids = urls.map(extractYouTubeId).filter(Boolean);
  if (!ids.length) return [];
  if (ytKey()) return ytVideoDetails([...new Set(ids)]);
  return [...new Set(ids)].map((id) => ({
    videoId: id,
    title: id,
    url: "https://www.youtube.com/watch?v=" + id,
    views: 0,
    postedAt: "",
    postedUnix: 0,
    kind: "youtube-video",
    platform: "youtube",
  }));
}

async function parseTikTokUrl(url) {
  const endpoint = "https://www.tikwm.com/api/?url=" + encodeURIComponent(url);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(endpoint);
      if (res.status === 429) {
        await sleep(1200);
        continue;
      }
      if (!res.ok) continue;
      const data = await res.json();
      if (String(data.msg || "").toLowerCase().includes("limit")) {
        await sleep(1200);
        continue;
      }
      const d = data.data;
      if (!d) continue;
      const created = Number(d.create_time || 0);
      const user = d.author || extractTikTokUser(url);
      const id = d.id || extractTikTokId(url);
      return {
        title: d.title || id || "TikTok",
        url: user && id ? "https://www.tiktok.com/@" + String(user).replace(/^@/, "") + "/video/" + id : url,
        views: Number(d.play_count || d.playCount || 0),
        postedAt: created ? toLocalInput(new Date(created * 1000)) : "",
        postedUnix: created || 0,
        kind: "tiktok",
        platform: "tiktok",
        author: String(user || "").replace(/^@/, ""),
      };
    } catch {
      await sleep(1100);
    }
  }
  return null;
}

async function parseTikTokProfile(uniqueId) {
  const user = String(uniqueId || "").replace(/^@/, "");
  const endpoint = "https://www.tikwm.com/api/user/posts?unique_id=" + encodeURIComponent(user) + "&count=30";
  try {
    const res = await fetch(endpoint);
    if (!res.ok) return null;
    const data = await res.json();
    const videos = data.data?.videos || data.data || [];
    if (!Array.isArray(videos) || !videos.length) return null;
    return videos.map((v) => {
      const created = Number(v.create_time || 0);
      const id = v.video_id || v.id;
      return {
        title: v.title || id,
        url: "https://www.tiktok.com/@" + user + "/video/" + id,
        views: Number(v.play_count || 0),
        postedAt: created ? toLocalInput(new Date(created * 1000)) : "",
        postedUnix: created || 0,
        kind: "tiktok",
        platform: "tiktok",
        author: user,
      };
    });
  } catch {
    return null;
  }
}

function inEvent(item, windowOnly) {
  if (!windowOnly) return true;
  if (!item.postedUnix && !item.postedAt) return true;
  const unix = item.postedUnix || Math.floor(Date.parse(item.postedAt) / 1000);
  if (!unix) return true;
  return unix >= EVENT_START && unix <= EVENT_END;
}

function upsertVideos(creatorId, items) {
  let added = 0;
  let updated = 0;
  items.forEach((item) => {
    const key = videoKey(item);
    const existing = state.videos.find((v) => v.creatorId === creatorId && videoKey(v) === key);
    if (existing) {
      if (item.views) existing.views = item.views;
      existing.title = item.title || existing.title;
      existing.postedAt = item.postedAt || existing.postedAt;
      existing.url = item.url || existing.url;
      existing.kind = item.kind || existing.kind;
      existing.platform = item.platform || existing.platform;
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

function setParseStatus(text, append) {
  const el = document.getElementById("parseStatus");
  const log = document.getElementById("parseLog");
  if (el) el.textContent = text;
  if (log) {
    if (!append) log.textContent = text + "\n";
    else log.textContent += text + "\n";
    log.scrollTop = log.scrollHeight;
  }
}

function matchCreatorForItem(item, url) {
  const creators = state.creators || [];
  const ttUser = (item && item.author) || extractTikTokUser(url || item?.url || "");
  const source = url || item?.url || "";
  if (ttUser && (/tiktok/i.test(source) || item?.platform === "tiktok")) {
    const hit = creators.find((c) => extractTikTokUser(c.tiktok).toLowerCase() === String(ttUser).toLowerCase());
    if (hit) return hit;
  }
  if (item?.channelId) {
    const byId = creators.find((c) => c.youtubeChannelId === item.channelId);
    if (byId) return byId;
  }
  const handle = youtubeHandleFrom(source);
  if (handle) {
    const byHandle = creators.find((c) => youtubeHandleFrom(c.youtube).toLowerCase() === handle.toLowerCase());
    if (byHandle) return byHandle;
  }
  return null;
}

async function syncCreator(creator, windowOnly) {
  const found = [];
  const notes = [];
  if (creator.youtube) {
    try {
      const vids = await parseYouTubeChannel(creator.youtube);
      if (vids[0]?.channelId) creator.youtubeChannelId = vids[0].channelId;
      const kept = vids.filter((v) => inEvent(v, windowOnly));
      found.push(...kept);
      notes.push("YouTube scanned " + vids.length + ", kept " + kept.length + (ytKey() ? "" : " (no API key — views=0)"));
    } catch (err) {
      notes.push("YouTube: " + err.message);
    }
  }
  if (creator.tiktok) {
    const profile = await parseTikTokProfile(creator.tiktok);
    if (profile) {
      const kept = profile.filter((v) => inEvent(v, windowOnly));
      found.push(...kept);
      notes.push("TikTok scanned " + profile.length + ", kept " + kept.length);
    } else {
      notes.push("TikTok profile list blocked — paste video links for this account");
    }
  }
  return { found, notes };
}

async function parseMixedText(text, fallbackCreatorId, windowOnly) {
  const urls = extractUrls(text);
  const summary = { urls: urls.length, added: 0, updated: 0, skipped: 0, notes: [] };
  if (!urls.length) {
    summary.notes.push("No http links found.");
    return summary;
  }

  const channelUrls = urls.filter((u) => isYouTubeChannelUrl(u));
  const ytVideoUrls = urls.filter((u) => extractYouTubeId(u));
  const ttProfileUrls = urls.filter((u) => /tiktok\.com/i.test(u) && isTikTokProfileUrl(u));
  const ttVideoUrls = urls.filter((u) => /tiktok\.com/i.test(u) && !isTikTokProfileUrl(u));

  for (const url of channelUrls) {
    const creator = matchCreatorForItem(null, url) || state.creators.find((c) => c.id === fallbackCreatorId);
    if (!creator) {
      summary.notes.push("No creator for YouTube channel " + url);
      summary.skipped += 1;
      continue;
    }
    setParseStatus("YouTube channel " + (creator.name || url) + "…", true);
    try {
      const vids = await parseYouTubeChannel(url);
      if (vids[0]?.channelId) creator.youtubeChannelId = vids[0].channelId;
      const kept = vids.filter((v) => inEvent(v, windowOnly));
      const r = upsertVideos(creator.id, kept);
      summary.added += r.added;
      summary.updated += r.updated;
      summary.notes.push(creator.name + " YT channel: +" + r.added + "/" + r.updated);
    } catch (err) {
      summary.notes.push("YT channel " + url + ": " + err.message);
    }
  }

  if (ytVideoUrls.length) {
    setParseStatus("YouTube videos ×" + ytVideoUrls.length + "…", true);
    try {
      const items = await parseYouTubeUrls(ytVideoUrls);
      for (const item of items) {
        if (!inEvent(item, windowOnly)) {
          summary.skipped += 1;
          continue;
        }
        const creator = matchCreatorForItem(item, item.url) || state.creators.find((c) => c.id === fallbackCreatorId);
        if (!creator) {
          summary.notes.push("No creator for " + item.url);
          summary.skipped += 1;
          continue;
        }
        const r = upsertVideos(creator.id, [item]);
        summary.added += r.added;
        summary.updated += r.updated;
      }
    } catch (err) {
      summary.notes.push("YouTube videos: " + err.message);
    }
  }

  for (const url of ttProfileUrls) {
    const user = extractTikTokUser(url);
    const creator = matchCreatorForItem({ author: user, platform: "tiktok" }, url) || state.creators.find((c) => c.id === fallbackCreatorId);
    if (!creator) {
      summary.notes.push("No creator for TikTok @" + user);
      summary.skipped += 1;
      continue;
    }
    setParseStatus("TikTok profile @" + user + "…", true);
    const profile = await parseTikTokProfile(user);
    if (!profile) {
      summary.notes.push("TikTok @" + user + " list blocked — paste individual video links");
      continue;
    }
    const kept = profile.filter((v) => inEvent(v, windowOnly));
    const r = upsertVideos(creator.id, kept);
    summary.added += r.added;
    summary.updated += r.updated;
    summary.notes.push(creator.name + " TT profile: +" + r.added + "/" + r.updated);
  }

  for (let i = 0; i < ttVideoUrls.length; i += 1) {
    const url = ttVideoUrls[i];
    setParseStatus("TikTok " + (i + 1) + "/" + ttVideoUrls.length + "…", true);
    const item = await parseTikTokUrl(url);
    const resolved = item || {
      title: url,
      url,
      views: 0,
      postedAt: "",
      postedUnix: 0,
      kind: "tiktok",
      platform: "tiktok",
      author: extractTikTokUser(url),
    };
    if (!inEvent(resolved, windowOnly)) {
      summary.skipped += 1;
      continue;
    }
    const creator = matchCreatorForItem(resolved, url) || state.creators.find((c) => c.id === fallbackCreatorId);
    if (!creator) {
      summary.notes.push("No creator for " + url);
      summary.skipped += 1;
      continue;
    }
    const r = upsertVideos(creator.id, [resolved]);
    summary.added += r.added;
    summary.updated += r.updated;
    if (i < ttVideoUrls.length - 1) await sleep(1100);
  }

  return summary;
}
