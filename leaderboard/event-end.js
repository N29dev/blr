(function () {
  var END = 1790481540;
  var origNorm = window.normalizeBoard;
  if (typeof origNorm === "function") {
    window.normalizeBoard = function (data, pairsDoc, source) {
      var out = origNorm(data, pairsDoc, source);
      if (out && out.settings) out.settings.eventEndUnix = END;
      return out;
    };
  }
  var origInEvent = window.inEvent;
  if (typeof origInEvent === "function") {
    window.inEvent = function (item, windowOnly) {
      if (!windowOnly) return true;
      if (!item) return true;
      if (!item.postedUnix && !item.postedAt) return true;
      var unix = item.postedUnix || Math.floor(Date.parse(item.postedAt) / 1000);
      if (!unix) return true;
      return unix >= EVENT_START && unix <= END;
    };
  }
  var origBoot = window.boot;
  if (typeof origBoot === "function") {
    window.boot = function (data) {
      if (data && data.settings) data.settings.eventEndUnix = END;
      origBoot(data);
    };
  }
})();
