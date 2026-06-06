(function () {
  const linkTypeLabels = {
    o: "custom",
    d: "download",
    e: "exit"
  };

  function getTimestamp() {
    return new Date().toLocaleTimeString("ja-JP", { hour12: false });
  }

  function renderTrackingLog(entry) {
    const status = document.getElementById("tracking-status");
    if (status) {
      status.textContent = entry.sent
        ? `${entry.time} sent: ${entry.linkName}`
        : `${entry.time} not sent: ${entry.linkName} (${entry.reason})`;
      status.classList.toggle("is-warning", !entry.sent);
    }

    const log = document.getElementById("tracking-log");
    if (!log) {
      return;
    }

    const item = document.createElement("li");
    const name = document.createElement("strong");
    const type = document.createElement("span");

    name.textContent = entry.linkName;
    type.textContent = linkTypeLabels[entry.linkType] || entry.linkType;
    item.append(name, type);

    if (entry.detail) {
      const detail = document.createElement("small");
      detail.textContent = entry.detail;
      item.append(detail);
    }

    log.prepend(item);

    while (log.children.length > 6) {
      log.lastElementChild.remove();
    }
  }

  function normalizeList(value) {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value;
    }
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function applyAppMeasurementVariables(config) {
    if (!window.s) {
      return function () {};
    }

    const variableMap = Object.assign({}, config.vars || {});
    if (config.events) {
      variableMap.events = config.events;
    }
    if (config.products) {
      variableMap.products = config.products;
    }

    const touched = {};
    Object.keys(variableMap).forEach((key) => {
      touched[key] = window.s[key];
      window.s[key] = variableMap[key];
    });

    const previousLinkTrackVars = window.s.linkTrackVars;
    const previousLinkTrackEvents = window.s.linkTrackEvents;
    const linkTrackVars = new Set(normalizeList(window.s.linkTrackVars));

    Object.keys(variableMap).forEach((key) => linkTrackVars.add(key));
    normalizeList(config.linkTrackVars).forEach((key) => linkTrackVars.add(key));

    if (linkTrackVars.size > 0) {
      window.s.linkTrackVars = Array.from(linkTrackVars).join(",");
    }

    const linkTrackEvents = new Set(normalizeList(window.s.linkTrackEvents));
    normalizeList(config.events).forEach((key) => linkTrackEvents.add(key));
    normalizeList(config.linkTrackEvents).forEach((key) => linkTrackEvents.add(key));

    if (linkTrackEvents.size > 0) {
      window.s.linkTrackEvents = Array.from(linkTrackEvents).join(",");
    }

    return function restoreVariables() {
      Object.keys(touched).forEach((key) => {
        if (typeof touched[key] === "undefined") {
          delete window.s[key];
        } else {
          window.s[key] = touched[key];
        }
      });
      window.s.linkTrackVars = previousLinkTrackVars;
      window.s.linkTrackEvents = previousLinkTrackEvents;
    };
  }

  function formatVariablePreview(config) {
    const rows = [];
    if (config.events) {
      rows.push(`events=${config.events}`);
    }
    if (config.products) {
      rows.push(`products=${config.products}`);
    }
    Object.keys(config.vars || {}).forEach((key) => {
      rows.push(`${key}=${config.vars[key]}`);
    });
    return rows.join("; ");
  }

  function trackAdobeLink(options) {
    const config = Object.assign({ linkType: "o", linkObject: true, detail: "" }, options);
    const variablePreview = formatVariablePreview(config);
    const entry = {
      detail: [config.detail, variablePreview].filter(Boolean).join(" | "),
      linkName: config.linkName,
      linkType: config.linkType,
      reason: "",
      sent: false,
      time: getTimestamp()
    };

    const restoreVariables = applyAppMeasurementVariables(config);

    try {
      if (window.s && typeof window.s.tl === "function") {
        window.s.tl(config.linkObject, config.linkType, config.linkName);
        entry.sent = true;
      } else {
        entry.reason = "window.s.tl unavailable";
      }
    } catch (error) {
      entry.reason = error && error.message ? error.message : "tracking error";
    } finally {
      restoreVariables();
    }

    renderTrackingLog(entry);
    return entry.sent;
  }

  window.SignalScope = Object.assign({}, window.SignalScope, {
    trackAdobeLink
  });
})();
