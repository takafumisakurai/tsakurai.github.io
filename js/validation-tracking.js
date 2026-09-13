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
        ? `${entry.time} SDK called: ${entry.linkName}`
        : `${entry.time} not SDK called: ${entry.linkName} (${entry.reason})`;
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

  function trackAdobeLink(options) {
    const config = Object.assign({ linkType: "o", linkObject: true, detail: "" }, options);
    const variablePreview = "Measurement: TS | Event name + fixed scenario attributes; native commerce only for commerce fixtures";
    const entry = {
      detail: [config.detail, variablePreview].filter(Boolean).join(" | "),
      linkName: config.linkName,
      linkType: config.linkType,
      reason: "",
      sent: false,
      time: getTimestamp()
    };

    try {
      if (window.tsMeasurement) {
        var state = window.tsMeasurement.track(config.linkName, {scenario: config.linkName, route: config.vars && config.vars.eVar40}, {pageView: config.linkName === 'spa_virtual_page_view',fixture:config,type:config.linkType});
        entry.sent = state === 'sdk-called';
        entry.reason = state;
      } else {
        entry.reason = "measurement adapter unavailable";
      }
    } catch (error) {
      entry.reason = error && error.message ? error.message : "tracking error";

    }

    renderTrackingLog(entry);
    return entry.sent;
  }

  function getPageNumberFromPath(pathname) {
    const match = pathname.match(/\/([1-5])\.html$/);
    return match ? match[1] : "";
  }

  function getCurrentPageNumber() {
    return getPageNumberFromPath(window.location.pathname);
  }

  function getTransitionSlot(link, fromPage, toPage) {
    if (link.classList.contains("brand")) {
      return "brand";
    }
    if (link.classList.contains("next-link")) {
      return "next";
    }
    if (link.closest(".test-nav")) {
      return fromPage === toPage ? "self_nav" : "nav";
    }
    if (link.classList.contains("button")) {
      return "cta";
    }
    return "link";
  }

  function setInternalTransitionParameters() {
    const fromPage = getCurrentPageNumber();
    if (!fromPage) {
      return;
    }

    document.querySelectorAll("a[href]").forEach((link) => {
      const rawHref = link.getAttribute("href");
      const targetMatch = rawHref && rawHref.match(/^([1-5])\.html(?:[?#]|$)/);
      if (!targetMatch) {
        return;
      }

      const toPage = targetMatch[1];
      const slot = getTransitionSlot(link, fromPage, toPage);
      const transitionId = `signalscope_p${fromPage}_to_p${toPage}_${slot}`;
      const url = new URL(rawHref, window.location.href);

      url.searchParams.set("aa_nav", transitionId);
      url.searchParams.set("aa_from", `${fromPage}.html`);
      url.searchParams.set("aa_to", `${toPage}.html`);
      url.searchParams.set("aa_slot", slot);

      link.setAttribute("href", `${toPage}.html?${url.searchParams.toString()}${url.hash}`);
      link.dataset.aaTransition = transitionId;
      link.dataset.aaFrom = `${fromPage}.html`;
      link.dataset.aaTo = `${toPage}.html`;
      link.dataset.aaSlot = slot;
    });
  }

  function getTransitionDetail(transition) {
    return `aa_nav=${transition.id}; from=${transition.from}; to=${transition.to}; slot=${transition.slot}`;
  }

  function getTransitionVars(transition, phase) {
    return {
      eVar120: transition.id,
      eVar121: transition.from,
      eVar122: transition.to,
      eVar123: transition.slot,
      eVar160: phase,
      eVar161: transition.from,
      eVar162: transition.to,
      eVar163: transition.slot
    };
  }

  function trackTransitionClick(event) {
    if (!event.target || typeof event.target.closest !== "function") {
      return;
    }

    const link = event.target.closest("a[data-aa-transition]");
    if (!link || event.defaultPrevented) {
      return;
    }

    const transition = {
      from: link.dataset.aaFrom,
      id: link.dataset.aaTransition,
      slot: link.dataset.aaSlot,
      to: link.dataset.aaTo
    };

    trackAdobeLink({
      detail: getTransitionDetail(transition),
      events: "event120",
      linkName: "page_transition_click",
      linkObject: link,
      linkType: "o",
      vars: getTransitionVars(transition, "click")
    });
  }

  function trackTransitionArrival() {
    const params = new URLSearchParams(window.location.search);
    const transitionId = params.get("aa_nav");
    if (!transitionId) {
      return;
    }

    const transition = {
      from: params.get("aa_from") || "unknown",
      id: transitionId,
      slot: params.get("aa_slot") || "unknown",
      to: params.get("aa_to") || `${getCurrentPageNumber() || "unknown"}.html`
    };

    let attempts = 0;
    const trackWhenReady = function () {
      attempts += 1;
      if (window.s || attempts >= 8) {
        trackAdobeLink({
          detail: getTransitionDetail(transition),
          events: "event121",
          linkName: "page_transition_arrival",
          linkObject: true,
          linkType: "o",
          vars: getTransitionVars(transition, "arrival")
        });
        return;
      }
      window.setTimeout(trackWhenReady, 250);
    };

    window.setTimeout(trackWhenReady, 250);
  }

  setInternalTransitionParameters();
  document.addEventListener("click", trackTransitionClick, true);
  trackTransitionArrival();

  window.SignalScope = Object.assign({}, window.SignalScope, {
    trackAdobeLink
  });
})();
