function formatPosted(iso) {
  if (!iso) return "-";
  var raw = String(iso).trim().replace(" ", "T");
  var d;
  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) d = new Date(raw);
  else d = new Date(raw + "+05:00");
  if (isNaN(d)) return String(iso).replace("T", " ");
  function p(n) { return String(n).padStart(2, "0"); }
  return d.getUTCFullYear() + "-" + p(d.getUTCMonth() + 1) + "-" + p(d.getUTCDate()) + " " + p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + " UTC";
}

(function () {
  var orig = window.render;
  if (typeof orig !== "function") return;
  window.render = function (data) {
    orig(data);
    document.querySelectorAll("#videoTable tr td:first-child").forEach(function (td) {
      td.textContent = formatPosted(td.textContent);
    });
  };
})();
