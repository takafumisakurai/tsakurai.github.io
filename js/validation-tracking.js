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
    item.innerHTML = [
      `<strong>${entry.linkName}</strong>`,
      `<span>${linkTypeLabels[entry.linkType] || entry.linkType}</span>`,
      entry.detail ? `<small>${entry.detail}</small>` : ""
    ].join("");
    log.prepend(item);

    while (log.children.length > 6) {
      log.lastElementChild.remove();
    }
  }

  function trackAdobeLink(options) {
    const config = Object.assign({ linkType: "o", linkObject: true, detail: "" }, options);
    const entry = {
      detail: config.detail,
      linkName: config.linkName,
      linkType: config.linkType,
      reason: "",
      sent: false,
      time: getTimestamp()
    };

    try {
      if (window.s && typeof window.s.tl === "function") {
        window.s.tl(config.linkObject, config.linkType, config.linkName);
        entry.sent = true;
      } else {
        entry.reason = "window.s.tl unavailable";
      }
    } catch (error) {
      entry.reason = error && error.message ? error.message : "tracking error";
    }

    renderTrackingLog(entry);
    return entry.sent;
  }

  window.SignalScope = Object.assign({}, window.SignalScope, {
    trackAdobeLink
  });
})();
