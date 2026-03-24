(function () {
  var config = (window.getSiteConfig && window.getSiteConfig()) || window.SITE_CONFIG || {};
  var body = document.body;
  var pageType = (body && body.getAttribute("data-page-type")) || "page";
  var pageName = (body && body.getAttribute("data-page-name")) || pageType;
  var pixelReady = false;
  var formSeen = false;
  window.trackMetaEvent = emitEvent;

  initPixel();
  applyMetaTags();
  applyConfig();
  registerGlobalTracking();
  trackPage();

  function initPixel() {
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

    window.fbq("init", config.metaPixelId);
    window.fbq("track", "PageView");
    pixelReady = true;
  }

  function applyMetaTags() {
    if (pageType === "landing") {
      replaceMeta('meta[name="description"]', config.pageDescription);
      replaceMeta('meta[property="og:description"]', config.pageDescription);
      replaceMeta('meta[name="twitter:description"]', config.pageDescription);
      replaceMeta('meta[property="og:title"]', config.pageTitle);
      replaceMeta('meta[name="twitter:title"]', config.pageTitle);
      if (config.pageTitle) {
        document.title = config.pageTitle;
      }
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
    var matchedProject = getMatchedProject();
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

    var reviewLink = document.querySelector("[data-review-link]");
    if (reviewLink && config.reviewUrl) {
      reviewLink.href = config.reviewUrl;
      reviewLink.classList.remove("hidden");
    }

    var mapLink = document.querySelector("[data-map-link]");
    if (mapLink && config.mapsUrl) {
      mapLink.href = config.mapsUrl;
      mapLink.classList.remove("hidden");
    }
  }

  function registerGlobalTracking() {
    document.querySelectorAll("[data-track]").forEach(function (node) {
      node.addEventListener("click", function () {
        var source = node.getAttribute("data-track") || "cta";

        if (source.indexOf("phone") === 0) {
          emitEvent("Contact", {
            content_name: source,
            content_category: pageName
          });
        }

        emitEvent("CTAInteraction", {
          placement: source,
          page_type: pageType
        }, "trackCustom");
      });
    });

    var form = document.getElementById("quote-form");
    if (!form || !("IntersectionObserver" in window)) {
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !formSeen) {
          formSeen = true;
          emitEvent("LeadFormView", {
            page_type: pageType
          }, "trackCustom");
          observer.disconnect();
        }
      });
    }, { threshold: 0.45 });

    observer.observe(form);
  }

  function trackPage() {
    emitEvent("ViewContent", {
      content_name: pageName,
      content_category: pageType
    });

    emitEvent("FunnelPageView", {
      page_name: pageName,
      page_type: pageType
    }, "trackCustom");

    if (pageType === "thank-you") {
      emitEvent("LeadConfirmationView", {
        page_name: pageName
      }, "trackCustom");
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
