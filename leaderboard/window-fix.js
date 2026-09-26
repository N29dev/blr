function inWindow(iso, startUnix, endUnix) {
  var raw = String(iso || "").trim().replace(" ", "T");
  if (!raw) return false;
  if (!/[zZ]|[+\-]\d{2}:\d{2}$/.test(raw)) raw += "+05:00";
  var t = new Date(raw);
  if (isNaN(t)) return false;
  var sec = Math.floor(t.getTime() / 1000);
  return sec >= startUnix && sec <= endUnix;
}
