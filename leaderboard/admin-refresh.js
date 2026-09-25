(function () {
  function log(level, msg) {
    if (typeof debugLog === "function") debugLog(level, msg);
    else if (typeof setParseStatus === "function") setParseStatus(msg, true);
  }

  function label(v) {
    const c = (state.creators || []).find((x) => x.id === v.creatorId);
    const who = (c && c.name) || "?";
    const title = String(v.title || "").replace(/\s+/g, " ").slice(0, 42);
    return who + (title ? " · " + title : "");
  }

  function applyViews(v, next, platform) {
    const oldN = Number(v.views) || 0;
    const newN = Number(next) || 0;
    if (newN <= 0) {
      log("warn", platform + " skip (no views)  " + label(v));
      return "skip";
    }
    if (newN > oldN) {
      v.views = newN;
      log("ok", platform + "  " + label(v) + "  " + fmtNum(oldN) + " → " + fmtNum(newN) + "  (+" + fmtNum(newN - oldN) + ")");
      return "up";
    }
    log("info", platform + "  " + label(v) + "  still " + fmtNum(oldN));
    return "same";
  }

  async function refreshViewsDetailed() {
    const ytVids = (state.videos || []).filter((v) => v.platform !== "tiktok" && detectKind(v.url, v.platform) !== "tiktok");
    const ttVids = (state.videos || []).filter((v) => v.platform === "tiktok" || detectKind(v.url, v.platform) === "tiktok");
    let up = 0, same = 0, skip = 0;
    log("info", "refresh start  YT " + ytVids.length + "  TT " + ttVids.length);

    if (ytVids.length) {
      log("info", "YouTube batch…");
      try {
        const fresh = await parseYouTubeUrls(ytVids.map((v) => v.url));
        const byId = {};
        (fresh || []).forEach((item) => {
          const id = extractYouTubeId(item.url);
          if (id) byId[id] = item;
        });
        ytVids.forEach((v) => {
          const item = byId[extractYouTubeId(v.url)];
          if (!item) {
            log("warn", "YT miss  " + label(v));
            skip += 1;
            return;
          }
          const r = applyViews(v, item.views, "YT");
          if (r === "up") up += 1;
          else if (r === "same") same += 1;
          else skip += 1;
        });
      } catch (err) {
        log("err", "YouTube refresh failed: " + (err.message || err));
      }
    }

    for (let i = 0; i < ttVids.length; i += 1) {
      const v = ttVids[i];
      log("info", "TikTok " + (i + 1) + "/" + ttVids.length + "  " + label(v));
      try {
        const item = await parseTikTokUrl(v.url);
        if (!item) {
          log("warn", "TT no data  " + label(v));
          skip += 1;
          continue;
        }
        const r = applyViews(v, item.views, "TT");
        if (r === "up") up += 1;
        else if (r === "same") same += 1;
        else skip += 1;
      } catch (err) {
        log("err", "TT fail  " + label(v) + "  " + (err.message || err));
        skip += 1;
      }
    }

    if (typeof renderAdmin === "function") renderAdmin();
    log("ok", "refresh done  updated " + up + "  unchanged " + same + "  skipped " + skip);
    log("info", "publish to push these numbers live");
  }

  function install() {
    const btn = document.getElementById("refreshViewsBtn");
    if (!btn || btn.dataset.loggedRefresh === "1") return;
    const next = btn.cloneNode(true);
    next.dataset.loggedRefresh = "1";
    btn.parentNode.replaceChild(next, btn);
    next.addEventListener("click", function () {
      refreshViewsDetailed().catch(function (err) {
        log("err", String(err.message || err));
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();
