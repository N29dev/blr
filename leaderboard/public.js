function rankItem(row, i, primary, secondary) {
  const onPodium = i < 5 && (row.stats.views > 0 || row.stats.qualCount > 0);
  return `
    <li class="${onPodium ? "top" : ""}">
      <span class="num">${i + 1}</span>
      <div class="who">${escapeHtml(row.creator.name)}<small>${escapeHtml(secondary)}</small></div>
      <div class="metric">${escapeHtml(primary)}</div>
    </li>
  `;
}

function render(data) {
  const s = data.settings;
  document.getElementById("windowLabel").textContent =
    formatFull(s.eventStartUnix) + "  →  " + formatFull(s.eventEndUnix);
  document.getElementById("countdown").textContent = countdownText(s.eventStartUnix, s.eventEndUnix);

  const byViews = ranked(data.creators, data.videos, s, "views");
  const byQual = ranked(data.creators, data.videos, s, "qualCount");

  document.getElementById("boardViews").innerHTML = byViews.length
    ? byViews.map((r, i) => rankItem(r, i, fmtNum(r.stats.views) + " views", r.stats.videoCount + " videos")).join("")
    : `<li class="empty">Waiting for creators.</li>`;

  document.getElementById("boardVideos").innerHTML = byQual.length
    ? byQual.map((r, i) => rankItem(r, i, r.stats.qualCount + " videos", fmtNum(r.stats.views) + " views")).join("")
    : `<li class="empty">Waiting for qualifying videos.</li>`;

  const q = (document.getElementById("search").value || "").toLowerCase();
  const rows = byViews.filter((r) => r.creator.name.toLowerCase().includes(q));
  document.getElementById("emptyState").style.display = data.creators.length ? "none" : "block";
  document.getElementById("allTable").innerHTML = rows.map((r, i) => {
    const c = r.creator;
    const yt = youtubeUrl(c.youtube);
    const tt = tiktokUrl(c.tiktok);
    return `<tr>
      <td>${i + 1}</td>
      <td><strong>${escapeHtml(c.name)}</strong></td>
      <td>
        ${yt ? `<a class="pill yt" href="${escapeHtml(yt)}" target="_blank" rel="noopener">YouTube</a>` : ""}
        ${tt ? `<a class="pill tt" href="${escapeHtml(tt)}" target="_blank" rel="noopener">TikTok</a>` : ""}
      </td>
      <td>${r.stats.videoCount}</td>
      <td>${r.stats.qualCount}</td>
      <td class="metric">${fmtNum(r.stats.views)}</td>
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

loadBoardData()
  .then((data) => {
    render(data);
    document.getElementById("search").addEventListener("input", () => render(data));
    setInterval(() => {
      document.getElementById("countdown").textContent =
        countdownText(data.settings.eventStartUnix, data.settings.eventEndUnix);
    }, 30000);
  })
  .catch(() => {
    document.getElementById("windowLabel").textContent = "Could not load public data.json";
  });
