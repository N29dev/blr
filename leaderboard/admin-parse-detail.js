(function () {
  function shortTitle(item) {
    return String((item && (item.title || item.url)) || "").replace(/\s+/g, " ").slice(0, 90);
  }

  function kindName(item) {
    var k = (item && (item.kind || item.platform)) || "";
    var url = String((item && item.url) || "");
    if (k === "tiktok" || /tiktok/i.test(url)) return "TikTok";
    if (k === "youtube-short" || /\/shorts\//i.test(url)) return "YT Short";
    return "YouTube";
  }

  function creatorName(id) {
    var list = (window.state && state.creators) || [];
    var hit = list.find(function (c) { return c.id === id; });
    return (hit && hit.name) || id || "unknown";
  }

  function whenOf(item) {
    if (typeof formatPosted === "function") return formatPosted(item && item.postedAt);
    return item && item.postedAt ? String(item.postedAt).replace("T", " ") : "no-date";
  }

  function lineFor(item, name, tag) {
    var views = Number((item && item.views) || 0).toLocaleString("en-US");
    return tag + " " + name + " | " + kindName(item) + " | " + views + " views | " + whenOf(item) + " | " + shortTitle(item);
  }

  function log(level, msg) {
    if (typeof debugLog === "function") debugLog(level, msg);
    else if (typeof setParseStatus === "function") setParseStatus(msg, true);
  }

  var origUpsert = window.upsertVideos;
  if (typeof origUpsert === "function") {
    window.upsertVideos = function (creatorId, items) {
      var name = creatorName(creatorId);
      var existing = {};
      ((window.state && state.videos) || []).forEach(function (v) {
        if (v.creatorId === creatorId) existing[videoKey(v)] = true;
      });
      (items || []).forEach(function (item) {
        var existed = !!existing[videoKey(item)];
        log(existed ? "info" : "ok", lineFor(item, name, existed ? "UPDATE" : "ADD"));
      });
      var r = origUpsert(creatorId, items || []);
      log("ok", name + " saved: +" + r.added + " new / " + r.updated + " updated");
      return r;
    };
  }

  var origParse = window.parseMixedText;
  if (typeof origParse === "function") {
    window.parseMixedText = async function (text, fallbackCreatorId, windowOnly) {
      log("info", "auto-parse start · windowOnly=" + !!windowOnly);
      var summary = await origParse(text, fallbackCreatorId, windowOnly);
      log("ok", "auto-parse done · links=" + summary.urls + " +" + summary.added + " new / " + summary.updated + " upd / " + summary.skipped + " skip");
      (summary.notes || []).forEach(function (n) {
        log(/skip|fail|error|block|denied/i.test(n) ? "warn" : "info", n);
      });
      return summary;
    };
  }

  var origRender = window.renderAdmin;
  if (typeof origRender === "function") {
    window.renderAdmin = function () {
      origRender();
      var tb = document.getElementById("adminVideos");
      if (!tb || !window.state) return;
      tb.innerHTML = state.videos.slice().sort(function (a, b) {
        return String(b.postedAt).localeCompare(String(a.postedAt));
      }).map(function (v) {
        var c = state.creators.find(function (x) { return x.id === v.creatorId; });
        var kind = kindLabel(v.kind || detectKind(v.url, v.platform));
        var title = escapeHtml(v.title || v.url || "");
        return "<tr>" +
          "<td>" + escapeHtml(whenOf(v)) + "</td>" +
          "<td>" + escapeHtml((c && c.name) || "-") + "</td>" +
          "<td><span class=\"pill " + kind.cls + "\">" + kind.text + "</span></td>" +
          "<td><a href=\"" + escapeHtml(v.url || "#") + "\" target=\"_blank\" rel=\"noopener\">" + title + "</a></td>" +
          "<td class=\"metric\">" + fmtNum(v.views) + "</td>" +
          "<td><button class=\"btn danger\" data-del-video=\"" + v.id + "\">X</button></td>" +
        "</tr>";
      }).join("");
    };
  }
})();
