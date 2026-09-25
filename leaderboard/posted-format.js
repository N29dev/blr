function formatPosted(iso) {
  if (!iso) return "-";
  var raw = String(iso).trim().replace(" ", "T");
  var d;
  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) d = new Date(raw);
  else d = new Date(raw + "+05:00");
  if (isNaN(d)) return raw.replace("T", " ");
  function p(n) { return String(n).padStart(2, "0"); }
  return d.getUTCFullYear() + "-" + p(d.getUTCMonth() + 1) + "-" + p(d.getUTCDate()) + " " + p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + " UTC";
}
