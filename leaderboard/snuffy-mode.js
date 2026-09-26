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
    if (hint) {
      hint.hidden = !on;
    }
  }

  var latest = null;
  var origBoot = window.boot;
  if (typeof origBoot === "function") {
    window.boot = function (data) {
      latest = data;
      origBoot(data);
    };
  }

  var origRender = window.render;
  if (typeof origRender === "function") {
    window.render = function (data) {
      if (!data) return;
      latest = data._source ? data : (latest || data);
      var source = data;
      if (on) {
        source = Object.assign({}, data, {
          videos: (data.videos || []).filter(isSnuffy),
        });
      }
      origRender(source);
      document.querySelectorAll("#videoTable tr td:nth-child(4)").forEach(function (td) {
        var title = td.textContent || "";
        if (/snuffy/i.test(title) && !td.querySelector(".pill.snuffy")) {
          var mark = document.createElement("span");
          mark.className = "pill snuffy";
          mark.textContent = "Snuffy";
          td.appendChild(document.createTextNode(" "));
          td.appendChild(mark);
        }
      });
    };
  }

  document.addEventListener("click", function (e) {
    if (!e.target || e.target.id !== "snuffyToggle") return;
    on = !on;
    paintBtn();
    if (latest && typeof window.render === "function") window.render(latest);
  });

  document.addEventListener("DOMContentLoaded", paintBtn);
  paintBtn();
})();
