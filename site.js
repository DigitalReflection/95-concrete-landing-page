(function () {
  var config = (window.getSiteConfig && window.getSiteConfig()) || window.SITE_CONFIG || {};
  var bootstrap = window.__META_BOOTSTRAP__ || {};
  var body = document.body;
  var pageType = (body && body.getAttribute("data-page-type")) || "page";
  var pageName = (body && body.getAttribute("data-page-name")) || pageType;
  var visitorId = bootstrap.visitorId || getOrCreateId("95_concrete_visitor_id", "visitor_");
  var sessionId = bootstrap.sessionId || getOrCreateSessionId();
  var pixelReady = Boolean(bootstrap.pixelReady);
  var formSeen = false;
  var matchedProject = null;
  var scrollMilestones = {};
  var sectionMilestones = {};

  window.trackMetaEvent = function (name, params, method, options) {
    emitEvent(name, baseParams(params || {}), method, options);
  };
  window.getMetaTrackingContext = getTrackingContext;
  window.storeMetaIdentity = storeMetaIdentity;

  initPixel();
  applyMetaTags();
  applyConfig();
  registerGlobalTracking();
  registerMapFrameTracking();
  registerSectionTracking();
  registerScrollTracking();
  registerEngagedTimeTracking();
  trackPage();

  function initPixel() {
    if (pixelReady && typeof window.fbq === "function") {
      return;
    }

    if (!config.metaPixelId || config.metaPixelId === "REPLACE_WITH_META_PIXEL_ID") {
      return;
    }

    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    var identity = loadStoredIdentity();
    identity.external_id = visitorId;
    window.fbq("init", config.metaPixelId, identity);
    window.fbq("track", "PageView");
    window.__META_PIXEL_INIT__ = true;
    window.__META_BOOTSTRAP__ = {
      pixelReady: true,
      pixelId: config.metaPixelId,
      sessionId: sessionId,
      visitorId: visitorId
    };
    pixelReady = true;
  }

  function applyMetaTags() {
    if (pageType !== "landing") {
      return;
    }

    replaceMeta('meta[name="description"]', config.pageDescription);
    replaceMeta('meta[property="og:description"]', config.pageDescription);
    replaceMeta('meta[name="twitter:description"]', config.pageDescription);
    replaceMeta('meta[property="og:title"]', config.pageTitle);
    replaceMeta('meta[name="twitter:title"]', config.pageTitle);

    if (config.pageTitle) {
      document.title = config.pageTitle;
    }
  }

  function replaceMeta(selector, value) {
    if (!value) {
      return;
    }

    var node = document.querySelector(selector);
    if (node) {
      node.setAttribute("content", value);
    }
  }

  function applyConfig() {
    updateText("[data-company-name]", config.companyName);
    updateText("[data-owner-name]", config.ownerName);
    updateText("[data-service-area]", config.serviceArea);
    updateText("[data-response-promise]", config.responsePromise);
    updateText("[data-cta-label]", config.ctaText);
    updateText("[data-cta-note]", config.ctaNote);

    var headline = document.querySelector("[data-dynamic-headline]");
    var subheadline = document.querySelector("[data-dynamic-subheadline]");
    matchedProject = getMatchedProject();

    if (headline && matchedProject) {
      headline.textContent = matchedProject.headline;
    } else if (headline && config.heroHeadline) {
      headline.textContent = config.heroHeadline;
    }

    if (subheadline && matchedProject) {
      subheadline.textContent = matchedProject.subheadline;
    } else if (subheadline && config.heroSubheadline) {
      subheadline.textContent = config.heroSubheadline;
    }

    document.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
      if (config.phoneDisplay && link.hasAttribute("data-replace-phone-text")) {
        link.textContent = config.phoneDisplay;
      }
      if (config.phoneLink) {
        link.href = "tel:" + config.phoneLink;
      }
    });

    var reviewLinks = document.querySelectorAll("[data-review-link]");
    reviewLinks.forEach(function (link) {
      if (config.reviewUrl) {
        link.href = config.reviewUrl;
        link.textContent = config.reviewLabel || link.textContent;
        link.classList.remove("hidden");
      }
    });

    var resolvedMapUrl = getResolvedMapUrl();
    document.querySelectorAll("[data-map-link]").forEach(function (link) {
      link.href = resolvedMapUrl;
    });

    var mapFrame = document.querySelector("[data-map-frame]");
    if (mapFrame) {
      mapFrame.src = getMapEmbedUrl();
    }
  }

  function registerGlobalTracking() {
    document.querySelectorAll("[data-track]").forEach(function (node) {
      node.addEventListener("click", function () {
        var source = node.getAttribute("data-track") || "cta";
        var href = node.getAttribute("href") || "";
        var section = getClosestSectionName(node);
        var isMapAction = source === "nav-map" ||
          source === "mobile-map-nav" ||
          source.indexOf("map-") === 0 ||
          href.indexOf("maps") !== -1 ||
          href === "#service-map";
        var context = baseParams({
          placement: source,
          destination: sanitizeDestination(href),
          section_name: section
        });

        if (source.indexOf("phone") === 0) {
          emitEvent("Contact", baseParams({
            content_name: source,
            content_category: pageName,
            section_name: section
          }));
          emitEvent("PhoneIntent", context, "trackCustom");
        }

        if (source.indexOf("nav") === 0 || source.indexOf("mobile-map-nav") === 0) {
          emitEvent("NavInteraction", context, "trackCustom");
        }

        if (isMapAction) {
          emitEvent("MapIntent", context, "trackCustom");
        }

        if (source.indexOf("reviews") === 0) {
          emitEvent("TrustIntent", context, "trackCustom");
        }

        emitEvent("CTAInteraction", context, "trackCustom");
      });
    });

    var form = document.getElementById("quote-form");
    if (!form || !("IntersectionObserver" in window)) {
      return;
    }

    var formObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !formSeen) {
          formSeen = true;
          emitEvent("LeadFormView", baseParams({
            page_type: pageType,
            page_name: pageName
          }), "trackCustom");
          formObserver.disconnect();
        }
      });
    }, { threshold: 0.45 });

    formObserver.observe(form);
  }

  function registerMapFrameTracking() {
    var mapFrame = document.querySelector("[data-map-frame]");
    if (!mapFrame) {
      return;
    }

    mapFrame.addEventListener("load", function () {
      emitEvent("MapEmbedLoad", baseParams({
        section_name: "service-map"
      }), "trackCustom");
    }, { once: true });
  }

  function registerSectionTracking() {
    if (!("IntersectionObserver" in window)) {
      return;
    }

    var sections = document.querySelectorAll("[data-section]");
    if (!sections.length) {
      return;
    }

    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) {
          return;
        }

        var name = entry.target.getAttribute("data-section");
        if (!name || sectionMilestones[name]) {
          return;
        }

        sectionMilestones[name] = true;
        emitEvent("SectionView", baseParams({
          section_name: name
        }), "trackCustom");
      });
    }, { threshold: 0.45 });

    sections.forEach(function (section) {
      sectionObserver.observe(section);
    });
  }

  function registerScrollTracking() {
    var thresholds = [25, 50, 75, 90];
    window.addEventListener("scroll", function () {
      var doc = document.documentElement;
      var scrollTop = doc.scrollTop || document.body.scrollTop;
      var scrollHeight = doc.scrollHeight - doc.clientHeight;
      var percent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 100;

      thresholds.forEach(function (threshold) {
        if (percent >= threshold && !scrollMilestones[threshold]) {
          scrollMilestones[threshold] = true;
          emitEvent("ScrollDepth", baseParams({
            percent: threshold
          }), "trackCustom");
        }
      });
    }, { passive: true });
  }

  function registerEngagedTimeTracking() {
    [15, 45].forEach(function (seconds) {
      window.setTimeout(function () {
        if (document.visibilityState === "visible") {
          emitEvent("EngagedTime", baseParams({
            seconds_engaged: seconds
          }), "trackCustom");
        }
      }, seconds * 1000);
    });
  }

  function trackPage() {
    emitEvent("ViewContent", baseParams({
      content_name: pageName,
      content_category: pageType
    }));

    emitEvent("FunnelPageView", baseParams({
      page_name: pageName,
      page_type: pageType
    }), "trackCustom");

    if (pageType === "thank-you") {
      emitEvent("LeadConfirmationView", baseParams({
        page_name: pageName
      }), "trackCustom");
    }

    if (pageType === "landing" && matchedProject) {
      emitEvent("AdMessageMatch", baseParams({
        project_type: matchedProject.projectType
      }), "trackCustom");
    }
  }

  function updateText(selector, value) {
    if (!value) {
      return;
    }

    document.querySelectorAll(selector).forEach(function (node) {
      node.textContent = value;
    });
  }

  function getMatchedProject() {
    var source = [
      location.search,
      getParam("utm_campaign"),
      getParam("utm_term"),
      getParam("utm_content")
    ].join(" ").toLowerCase();

    if (!source.trim()) {
      return null;
    }

    var patterns = [
      {
        test: /(driveway|drive way)/,
        headline: "Driveway replacement and new concrete driveway estimates.",
        subheadline: "If your ad was about driveways, this page stays about driveways. Tell us the size, condition, and timeline and we will follow up fast.",
        projectType: "Driveway"
      },
      {
        test: /patio/,
        headline: "Concrete patio quotes with a clean, durable finish.",
        subheadline: "If your ad was about patios, this page stays about patios. Share the size and layout you want and we will follow up fast.",
        projectType: "Patio"
      },
      {
        test: /(repair|crack|broken|patch)/,
        headline: "Concrete repair quotes for cracked, broken, or failing surfaces.",
        subheadline: "If your ad was about repairs, this page stays about repairs. Tell us what is failing and how soon you need help.",
        projectType: "Repair"
      },
      {
        test: /(slab|pad)/,
        headline: "Concrete slab and pad estimates for homes and utility projects.",
        subheadline: "If your ad was about slabs or pads, this page stays on that job type so the next step is obvious.",
        projectType: "Slab"
      },
      {
        test: /sidewalk|walkway/,
        headline: "Concrete sidewalk and walkway estimates for safer access.",
        subheadline: "If your ad was about sidewalks, this page keeps the message tight so you can request a quote without hunting around.",
        projectType: "Sidewalk"
      }
    ];

    for (var i = 0; i < patterns.length; i += 1) {
      if (patterns[i].test.test(source)) {
        var select = document.querySelector('[name="project_type"]');
        if (select && !select.value) {
          select.value = patterns[i].projectType;
        }
        return patterns[i];
      }
    }

    return null;
  }

  function storeMetaIdentity(identity) {
    if (!identity || typeof identity !== "object") {
      return;
    }

    var next = loadStoredIdentity();
    ["em", "ph", "fn"].forEach(function (key) {
      if (identity[key]) {
        next[key] = identity[key];
      }
    });
    next.external_id = visitorId;
    localStorage.setItem("95_concrete_meta_identity", JSON.stringify(next));
  }

  function loadStoredIdentity() {
    try {
      return JSON.parse(localStorage.getItem("95_concrete_meta_identity") || "{}");
    } catch (error) {
      return {};
    }
  }

  function getResolvedMapUrl() {
    if (config.mapsUrl) {
      return config.mapsUrl;
    }
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(config.serviceArea || "Concrete contractor");
  }

  function getMapEmbedUrl() {
    return "https://www.google.com/maps?q=" + encodeURIComponent(config.serviceArea || "Concrete contractor") + "&output=embed";
  }

  function getOrCreateId(key, prefix) {
    var existing = localStorage.getItem(key);
    if (existing) {
      return existing;
    }

    var value = prefix + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, value);
    return value;
  }

  function getOrCreateSessionId() {
    var key = "95_concrete_session_id";
    var existing = sessionStorage.getItem(key);
    if (existing) {
      return existing;
    }

    var value = "session_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(key, value);
    return value;
  }

  function getTrackingContext() {
    return {
      page_name: pageName,
      page_type: pageType,
      visitor_id: visitorId,
      session_id: sessionId,
      external_id: visitorId,
      event_source_url: window.location.href,
      utm_source: localStorage.getItem("utm_source") || getParam("utm_source") || "",
      utm_medium: localStorage.getItem("utm_medium") || getParam("utm_medium") || "",
      utm_campaign: localStorage.getItem("utm_campaign") || getParam("utm_campaign") || "",
      utm_content: localStorage.getItem("utm_content") || getParam("utm_content") || "",
      utm_term: localStorage.getItem("utm_term") || getParam("utm_term") || "",
      fbclid: localStorage.getItem("fbclid") || getParam("fbclid") || "",
      service_area: config.serviceArea || "",
      matched_project: matchedProject ? matchedProject.projectType : ""
    };
  }

  function baseParams(extra) {
    var params = getTrackingContext();
    Object.keys(extra || {}).forEach(function (key) {
      params[key] = extra[key];
    });
    params.fbclid_present = params.fbclid ? 1 : 0;
    return params;
  }

  function getClosestSectionName(node) {
    var section = node.closest("[data-section]");
    return section ? section.getAttribute("data-section") : "";
  }

  function sanitizeDestination(href) {
    if (!href) {
      return "";
    }
    if (href.indexOf("http") === 0 || href.indexOf("tel:") === 0 || href.indexOf("#") === 0) {
      return href;
    }
    return href.replace(window.location.origin, "");
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  function emitEvent(name, params, method, options) {
    if (!pixelReady || typeof window.fbq !== "function") {
      return;
    }

    var fbMethod = method || "track";
    if (options) {
      window.fbq(fbMethod, name, params || {}, options);
      return;
    }
    window.fbq(fbMethod, name, params || {});
  }
})();
