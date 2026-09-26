(function () {
  var on = false;

  function isSnuffy(v) {
    return /snuffy/i.test(String((v && v.title) || "") + " " + String((v && v.url) || ""));
  }

  function boostViews(v) {
    if (!isSnuffy(v)) return v;
    return Object.assign({}, v, { views: Number(v.views || 0) * 2 });
  }

  function paintBtn() {
    var b = document.getElementById("snuffyToggle");
    if (!b) return;
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
    b.textContent = on ? "Snuffy mode · ON" : "Snuffy mode · OFF";
    var hint = document.getElementById("snuffyHint");
    if (hint) hint.hidden = !on;
  }

  var latest = null;
  var origBoot = window.boot;
  if (typeof origBoot === "function") {
    window.boot = function (data) {
      latest = data;
      origBoot(data);
    };
  }

  var origRanked = window.ranked;
  if (typeof origRanked === "function") {
    window.ranked = function (creators, videos, settings, key) {
      var list = on ? (videos || []).map(boostViews) : videos;
      return origRanked(creators, list, settings, key);
    };
  }

  var origQualify = window.qualifyInfo;
  if (typeof origQualify === "function") {
    window.qualifyInfo = function (video, settings) {
      return origQualify(on ? boostViews(video) : video, settings);
    };
  }

  var origRender = window.render;
  if (typeof origRender === "function") {
    window.render = function (data) {
      if (data) latest = data;
      origRender(data);
      document.querySelectorAll("#videoTable tr").forEach(function (tr) {
        var td = tr.children[3];
        if (!td) return;
        if (!/snuffy/i.test(td.textContent || "")) return;
        var mark = td.querySelector(".pill.snuffy");
        if (!mark) {
          mark = document.createElement("span");
          mark.className = "pill snuffy";
          td.appendChild(document.createTextNode(" "));
          td.appendChild(mark);
        }
        mark.textContent = on ? "Snuffy ×2 views" : "Snuffy";
      });
    };
  }

  document.addEventListener("click", function (e) {
    if (!e.target || e.target.id !== "snuffyToggle") return;
    on = !on;
    paintBtn();
    if (latest && typeof window.render === "function") window.render(latest);
  });

  paintBtn();
})();
