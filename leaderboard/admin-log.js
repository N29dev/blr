(function () {
  const MAX = 400;

  function stamp() {
    const d = new Date();
    return d.toISOString().slice(11, 23);
  }

  function levelOf(text) {
    const t = String(text || "").toLowerCase();
    if (/fail|error|wrong|could not|denied|blocked/.test(t)) return "err";
    if (/skip|warn|no api|views=0|missing|limit/.test(t)) return "warn";
    if (/\+|added|merged|published|ok|kept|refresh|ready/.test(t)) return "ok";
    return "info";
  }

  window.debugLog = function debugLog(level, msg) {
    const el = document.getElementById("parseLog");
    const status = document.getElementById("parseStatus");
    const text = String(msg || "");
    if (status) status.textContent = text;
    if (!el) return;
    const row = document.createElement("div");
    row.className = "term-line " + (level || "info");
    const time = document.createElement("span");
    time.className = "term-time";
    time.textContent = stamp();
    const lvl = document.createElement("span");
    lvl.className = "term-lvl";
    lvl.textContent = level || "info";
    const body = document.createElement("span");
    body.className = "term-msg";
    body.textContent = text;
    row.appendChild(time);
    row.appendChild(lvl);
    row.appendChild(body);
    el.appendChild(row);
    while (el.childNodes.length > MAX) el.removeChild(el.firstChild);
    el.scrollTop = el.scrollHeight;
  };

  window.setParseStatus = function (text) {
    debugLog(levelOf(text), text);
  };

  window.clearDebugLog = function () {
    const el = document.getElementById("parseLog");
    if (el) el.innerHTML = "";
    debugLog("info", "log cleared");
  };

  document.addEventListener("click", function (e) {
    if (e.target && e.target.id === "clearLogBtn") clearDebugLog();
  });

  document.addEventListener("DOMContentLoaded", function () {
    debugLog("info", "admin terminal ready");
    debugLog("info", "auto-parse / sync / refresh / publish lines show here");
  });

  setInterval(function () {
    const el = document.getElementById("publishStatus");
    if (!el || !el.textContent) return;
    if (el.dataset.logged === el.textContent) return;
    el.dataset.logged = el.textContent;
    debugLog(levelOf(el.textContent), el.textContent);
  }, 350);
})();
