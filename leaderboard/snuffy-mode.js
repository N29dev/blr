(function () {
  var on = false;

  function isSnuffy(v) {
    return /snuffy/i.test(String((v && v.title) || "") + " " + String((v && v.url) || ""));
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
      if (!on) return origRanked(creators, videos, settings, key);
      if (key !== "qualSum" && key !== "qualMax") {
        return origRanked(creators, videos, settings, key);
      }
      var min = Number((settings && settings.minViews) || 5000);
      var extra = [];
      (videos || []).forEach(function (v) {
        if (isSnuffy(v) && Number(v.views || 0) >= min) extra.push(v);
      });
      return origRanked(creators, (videos || []).concat(extra), settings, key);
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
        var viewsTd = tr.children[4];
        var views = Number(String((viewsTd && viewsTd.textContent) || "0").replace(/[^0-9]/g, "")) || 0;
        mark.textContent = on && views >= 5000 ? "Snuffy ×2 videos" : "Snuffy";
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
