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

function render(data) {
  const s = data.settings;
  document.getElementById("windowLabel").textContent =
    formatFull(s.eventStartUnix) + "  →  " + formatFull(s.eventEndUnix);
  document.getElementById("countdown").textContent = countdownText(s.eventStartUnix, s.eventEndUnix);

  const byViewsSum = ranked(data.creators, data.videos, s, "viewsSum");
  const byViewsMax = ranked(data.creators, data.videos, s, "viewsMax");
  const byQualSum = ranked(data.creators, data.videos, s, "qualSum");
  const byQualMax = ranked(data.creators, data.videos, s, "qualMax");

  fillBoard(
    "boardViewsSum",
    byViewsSum,
    (r) => fmtNum(r.stats.viewsSum) + " views",
    (r) => `YT ${fmtNum(r.stats.youtube.views)} · TT ${fmtNum(r.stats.tiktok.views)}`,
    (r) => r.stats.viewsSum
  );
  fillBoard(
    "boardVideosSum",
    byQualSum,
    (r) => r.stats.qualSum + " videos",
    (r) => `YT ${r.stats.youtube.qualCount} · TT ${r.stats.tiktok.qualCount}`,
    (r) => r.stats.qualSum
  );
  fillBoard(
    "boardViewsMax",
    byViewsMax,
    (r) => fmtNum(r.stats.viewsMax) + " views",
    (r) => r.stats.viewsMaxPlatform,
    (r) => r.stats.viewsMax
  );
  fillBoard(
    "boardVideosMax",
    byQualMax,
    (r) => r.stats.qualMax + " videos",
    (r) => r.stats.qualMaxPlatform,
    (r) => r.stats.qualMax
  );

  const q = (document.getElementById("search").value || "").toLowerCase();
  const rows = byViewsSum.filter((r) => r.creator.name.toLowerCase().includes(q));
  document.getElementById("emptyState").style.display = data.creators.length ? "none" : "block";
  document.getElementById("allTable").innerHTML = rows.map((r, i) => {
    const c = r.creator;
    const yt = youtubeUrl(c.youtube);
    const tt = tiktokUrl(c.tiktok);
    return `<tr>
      <td>${i + 1}</td>
      <td class="name-cell">${avatarHtml(c, "sm")}<span><strong>${escapeHtml(c.name)}</strong>${c.source === "pair" || (c.youtube && c.tiktok) ? ' <span class="pill ok">YT+TT</span>' : ""}</span></td>
      <td>
        ${yt ? `<a class="pill yt" href="${escapeHtml(yt)}" target="_blank" rel="noopener">YouTube</a>` : ""}
        ${tt ? `<a class="pill tt" href="${escapeHtml(tt)}" target="_blank" rel="noopener">TikTok</a>` : ""}
      </td>
      <td class="metric">${fmtNum(r.stats.youtube.views)}</td>
      <td class="metric">${fmtNum(r.stats.tiktok.views)}</td>
      <td class="metric">${fmtNum(r.stats.viewsSum)}</td>
      <td class="metric">${fmtNum(r.stats.viewsMax)}</td>
      <td>${r.stats.qualSum}</td>
      <td>${r.stats.qualMax}</td>
    </tr>`;
  }).join("");

  const vids = [...data.videos].sort((a, b) => String(b.postedAt).localeCompare(String(a.postedAt)));
  document.getElementById("videoTable").innerHTML = vids.map((v) => {
    const c = data.creators.find((x) => x.id === v.creatorId);
    const kind = kindLabel(v.kind || detectKind(v.url, v.platform));
    const ok = inWindow(v.postedAt, s.eventStartUnix, s.eventEndUnix) && Number(v.views) >= Number(s.minViews);
    return `<tr>
      <td>${escapeHtml((v.postedAt || "").replace("T", " "))}</td>
      <td>${escapeHtml(c?.name || "—")}</td>
      <td><span class="pill ${kind.cls}">${kind.text}</span></td>
      <td><a href="${escapeHtml(v.url)}" target="_blank" rel="noopener">${escapeHtml(v.title || v.url)}</a></td>
      <td class="metric">${fmtNum(v.views)}</td>
      <td>${ok ? '<span class="pill ok">Yes</span>' : '<span class="pill no">No</span>'}</td>
    </tr>`;
  }).join("");
}

function setLiveStatus(data) {
  const el = document.getElementById("liveStatus");
  if (!el) return;
  const when = data.settings && data.settings.updatedAt
    ? new Date(data.settings.updatedAt).toLocaleTimeString()
    : "—";
  const src = data._source === "github" ? "live (GitHub, no Pages wait)" : "Pages cache";
  el.textContent = "Data " + src + " · published " + when;
}

let boardData = null;

function boot(data) {
  boardData = data;
  render(data);
  setLiveStatus(data);
}

loadBoardData()
  .then((data) => {
    boot(data);
    document.getElementById("search").addEventListener("input", () => render(boardData));
    setInterval(() => {
      if (!boardData) return;
      document.getElementById("countdown").textContent =
        countdownText(boardData.settings.eventStartUnix, boardData.settings.eventEndUnix);
    }, 30000);
    setInterval(() => {
      loadBoardData().then(boot).catch(() => {});
    }, 45000);
  })
  .catch(() => {
    document.getElementById("windowLabel").textContent = "Could not load public data.json";
  });
