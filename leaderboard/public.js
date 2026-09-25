function rankItem(row, i, primary, secondary, score) {
  const onPodium = i < 5 && Number(score) > 0;
  return `
    <li class="${onPodium ? "top" : ""}">
      <span class="num">${i + 1}</span>
      <div class="who">${avatarHtml(row.creator)}<span class="who-text">${escapeHtml(row.creator.name)}<small>${escapeHtml(secondary)}</small></span></div>
      <div class="metric">${escapeHtml(primary)}</div>
    </li>
  `;
}

function fillBoard(id, rows, primaryFn, secondaryFn, scoreFn) {
  const el = document.getElementById(id);
  el.innerHTML = rows.length
    ? rows.map((r, i) => rankItem(r, i, primaryFn(r), secondaryFn(r), scoreFn(r))).join("")
    : `<li class="empty">Waiting for creators.</li>`;
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatLocal(unix) {
  return new Date(Number(unix) * 1000).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatUtc(unix) {
  return new Date(Number(unix) * 1000).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function humanClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return d + "d " + pad2(h) + "h " + pad2(m) + "m " + pad2(sec) + "s";
  return pad2(h) + "h " + pad2(m) + "m " + pad2(sec) + "s";
}

function paintClock(settings) {
  if (!settings) return;
  const start = Number(settings.eventStartUnix) * 1000;
  const end = Number(settings.eventEndUnix) * 1000;
  const now = Date.now();
  const total = Math.max(1, end - start);
  const win = document.getElementById("windowLabel");
  const utc = document.getElementById("windowUtc");
  const cd = document.getElementById("countdown");
  const fill = document.getElementById("timeBarFill");
  const bar = document.getElementById("timeBar");
  const meta = document.getElementById("timeBarPct");
  if (win) win.textContent = "Your time: " + formatLocal(settings.eventStartUnix) + "  \u2192  " + formatLocal(settings.eventEndUnix);
  if (utc) utc.textContent = "UTC: " + formatUtc(settings.eventStartUnix) + "  \u2192  " + formatUtc(settings.eventEndUnix);

  let label;
  let pct;
  let phase;
  if (now < start) {
    phase = "before";
    label = "Starts in " + humanClock(start - now);
    pct = 0;
  } else if (now >= end) {
    phase = "after";
    label = "Event ended";
    pct = 100;
  } else {
    phase = "live";
    label = "Ends in " + humanClock(end - now);
    pct = ((now - start) / total) * 100;
  }
  if (cd) cd.textContent = label;
  if (fill) fill.style.width = Math.min(100, Math.max(0, pct)).toFixed(3) + "%";
  if (bar) bar.dataset.phase = phase;
  if (meta) {
    meta.textContent = phase === "before"
      ? "Not started"
      : phase === "after"
        ? "100% elapsed"
        : pct.toFixed(1) + "% elapsed";
  }
}

function qualifyInfo(video, settings) {
  const inside = inWindow(video.postedAt, settings.eventStartUnix, settings.eventEndUnix);
  const enough = Number(video.views) >= Number(settings.minViews);
  if (inside && enough) return { ok: true, text: "Counts", cls: "ok" };
  const why = [];
  if (!inside) why.push("outside window");
  if (!enough) why.push("under 5k");
  return { ok: false, text: why.join(" + ") || "No", cls: "no" };
}

function render(data) {
  const s = data.settings;
  paintClock(s);

  const byViewsSum = ranked(data.creators, data.videos, s, "viewsSum");
  const byViewsMax = ranked(data.creators, data.videos, s, "viewsMax");
  const byQualSum = ranked(data.creators, data.videos, s, "qualSum");
  const byQualMax = ranked(data.creators, data.videos, s, "qualMax");

  fillBoard("boardViewsSum", byViewsSum, (r) => fmtNum(r.stats.viewsSum) + " views", (r) => "YT " + fmtNum(r.stats.youtube.views) + " / TT " + fmtNum(r.stats.tiktok.views), (r) => r.stats.viewsSum);
  fillBoard("boardVideosSum", byQualSum, (r) => r.stats.qualSum + " videos", (r) => "YT " + r.stats.youtube.qualCount + " / TT " + r.stats.tiktok.qualCount, (r) => r.stats.qualSum);
  fillBoard("boardViewsMax", byViewsMax, (r) => fmtNum(r.stats.viewsMax) + " views", (r) => r.stats.viewsMaxPlatform, (r) => r.stats.viewsMax);
  fillBoard("boardVideosMax", byQualMax, (r) => r.stats.qualMax + " videos", (r) => r.stats.qualMaxPlatform, (r) => r.stats.qualMax);

  const q = (document.getElementById("search").value || "").toLowerCase();
  const rows = byViewsSum.filter((r) => r.creator.name.toLowerCase().includes(q));
  document.getElementById("emptyState").style.display = data.creators.length ? "none" : "block";
  document.getElementById("allTable").innerHTML = rows.map((r, i) => {
    const c = r.creator;
    const yt = youtubeUrl(c.youtube);
    const tt = tiktokUrl(c.tiktok);
    return "<tr>" +
      "<td>" + (i + 1) + "</td>" +
      "<td class=\"name-cell\">" + avatarHtml(c, "sm") + "<span><strong>" + escapeHtml(c.name) + "</strong>" +
        (c.source === "pair" || (c.youtube && c.tiktok) ? " <span class=\"pill ok\">YT+TT</span>" : "") +
      "</span></td>" +
      "<td>" +
        (yt ? "<a class=\"pill yt\" href=\"" + escapeHtml(yt) + "\" target=\"_blank\" rel=\"noopener\">YouTube</a>" : "") +
        (tt ? "<a class=\"pill tt\" href=\"" + escapeHtml(tt) + "\" target=\"_blank\" rel=\"noopener\">TikTok</a>" : "") +
      "</td>" +
      "<td class=\"metric\">" + fmtNum(r.stats.youtube.views) + "</td>" +
      "<td class=\"metric\">" + fmtNum(r.stats.tiktok.views) + "</td>" +
      "<td class=\"metric\">" + fmtNum(r.stats.viewsSum) + "</td>" +
      "<td class=\"metric\">" + fmtNum(r.stats.viewsMax) + "</td>" +
      "<td>" + r.stats.qualSum + "</td>" +
      "<td>" + r.stats.qualMax + "</td>" +
    "</tr>";
  }).join("");

  const vq = (document.getElementById("videoSearch") && document.getElementById("videoSearch").value || "").toLowerCase().trim();
  const vids = [...data.videos].sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt))).filter((v) => {
    if (!vq) return true;
    const c = data.creators.find((x) => x.id === v.creatorId);
    const kind = kindLabel(v.kind || detectKind(v.url, v.platform));
    const why = qualifyInfo(v, s);
    const blob = [c && c.name, v.title, v.url, kind.text, why.text, v.postedAt].join(" ").toLowerCase();
    return blob.indexOf(vq) >= 0;
  });
  const videoEmpty = document.getElementById("videoEmpty");
  if (videoEmpty) {
    videoEmpty.style.display = vids.length ? "none" : "block";
    videoEmpty.textContent = vq
      ? "No logged videos match \"" + vq + "\". If it is missing entirely, it was not parsed/published yet."
      : "No videos logged yet.";
  }
  document.getElementById("videoTable").innerHTML = vids.map((v) => {
    const c = data.creators.find((x) => x.id === v.creatorId);
    const kind = kindLabel(v.kind || detectKind(v.url, v.platform));
    const why = qualifyInfo(v, s);
    return "<tr>" +
      "<td>" + escapeHtml((v.postedAt || "").replace("T", " ")) + "</td>" +
      "<td>" + escapeHtml((c && c.name) || "-") + "</td>" +
      "<td><span class=\"pill " + kind.cls + "\">" + kind.text + "</span></td>" +
      "<td><a href=\"" + escapeHtml(v.url) + "\" target=\"_blank\" rel=\"noopener\">" + escapeHtml(v.title || v.url) + "</a></td>" +
      "<td class=\"metric\">" + fmtNum(v.views) + "</td>" +
      "<td><span class=\"pill " + why.cls + "\">" + escapeHtml(why.text) + "</span></td>" +
    "</tr>";
  }).join("");
}

function setLiveStatus(data) {
  const el = document.getElementById("liveStatus");
  if (!el) return;
  const when = data.settings && data.settings.updatedAt
    ? new Date(data.settings.updatedAt).toLocaleTimeString()
    : "-";
  const src = data._source === "github" ? "live (GitHub)" : "Pages";
  el.textContent = "Data " + src + " / published " + when;
}

let boardData = null;

function bindFilters() {
  const search = document.getElementById("search");
  const videoSearch = document.getElementById("videoSearch");
  if (search && !search.dataset.bound) {
    search.dataset.bound = "1";
    search.addEventListener("input", function () { if (boardData) render(boardData); });
  }
  if (videoSearch && !videoSearch.dataset.bound) {
    videoSearch.dataset.bound = "1";
    videoSearch.addEventListener("input", function () { if (boardData) render(boardData); });
  }
}

function boot(data) {
  if (!data) return;
  if (boardData && boardData.settings && data.settings) {
    const have = Date.parse(boardData.settings.updatedAt || 0) || 0;
    const incoming = Date.parse(data.settings.updatedAt || 0) || 0;
    if (boardData._source === "github" && data._source === "pages" && incoming <= have) return;
    if (incoming < have) return;
  }
  boardData = data;
  render(data);
  setLiveStatus(data);
  bindFilters();
}

loadPagesBoard()
  .then((data) => {
    boot(data);
    setInterval(() => {
      if (boardData) paintClock(boardData.settings);
    }, 250);
    loadGithubBoard().then(boot).catch(function () {});
    setInterval(() => {
      loadGithubBoard().then(boot).catch(function () {});
    }, 60000);
  })
  .catch(() => {
    loadGithubBoard()
      .then((data) => {
        boot(data);
        setInterval(() => {
          if (boardData) paintClock(boardData.settings);
        }, 250);
      })
      .catch(() => {
        document.getElementById("windowLabel").textContent = "Could not load public data.json";
      });
  });
