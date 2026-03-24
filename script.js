(function () {
  var baseConfig = window.SITE_CONFIG || {};
  var config = mergeConfig(baseConfig, loadOverrides());
  var form = document.getElementById("quote-form");
  var statusEl = document.getElementById("form-status");
  var serviceAreaEl = document.getElementById("service-area");
  var pixelReady = typeof window.fbq === "function" &&
    config.metaPixelId &&
    config.metaPixelId !== "REPLACE_WITH_META_PIXEL_ID";
  var formStarted = false;

  if (serviceAreaEl && config.serviceArea) {
    serviceAreaEl.textContent = config.serviceArea;
  }

  applyMetaTags();

  applySiteConfig();
  persistAttribution();
  hydrateHiddenFields();
  registerTracking();

  if (pixelReady) {
    trackMeta("ViewContent", {
      content_name: "95 Concrete Landing Page",
      content_category: "Lead Generation",
      status: "viewed"
    });
    trackMeta("LandingPageView", {
      page_type: "home",
      source: "facebook"
    }, "trackCustom");
  }

  function applySiteConfig() {
    var phoneLinks = document.querySelectorAll('a[href^="tel:"]');
    phoneLinks.forEach(function (link) {
      if (config.phoneDisplay) {
        link.textContent = config.phoneDisplay;
      }
      if (config.phoneLink) {
        link.href = "tel:" + config.phoneLink;
      }
    });
  }

  function applyMetaTags() {
    if (config.pageTitle) {
      document.title = config.pageTitle;
      var ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute("content", config.pageTitle);
      }
    }

    if (config.pageDescription) {
      var metaDescription = document.querySelector('meta[name="description"]');
      var ogDescription = document.querySelector('meta[property="og:description"]');
      if (metaDescription) {
        metaDescription.setAttribute("content", config.pageDescription);
      }
      if (ogDescription) {
        ogDescription.setAttribute("content", config.pageDescription);
      }
    }
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  function persistAttribution() {
    var fields = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"];
    fields.forEach(function (field) {
      var value = getParam(field);
      if (value) {
        localStorage.setItem(field, value);
      }
    });

    if (!localStorage.getItem("landing_page")) {
      localStorage.setItem("landing_page", window.location.href);
    }

    if (document.referrer && !localStorage.getItem("referrer")) {
      localStorage.setItem("referrer", document.referrer);
    }

    if (!getCookie("_fbc")) {
      var fbclid = getParam("fbclid");
      if (fbclid) {
        var fbc = "fb.1." + Date.now() + "." + fbclid;
        setCookie("_fbc", fbc, 90);
      }
    }
  }

  function hydrateHiddenFields() {
    if (!form) {
      return;
    }

    setField("page_url", window.location.href);
    setField("page_title", document.title);
    setField("landing_page", localStorage.getItem("landing_page") || window.location.href);
    setField("referrer", localStorage.getItem("referrer") || document.referrer || "");
    setField("utm_source", localStorage.getItem("utm_source") || "");
    setField("utm_medium", localStorage.getItem("utm_medium") || "");
    setField("utm_campaign", localStorage.getItem("utm_campaign") || "");
    setField("utm_content", localStorage.getItem("utm_content") || "");
    setField("utm_term", localStorage.getItem("utm_term") || "");
    setField("fbclid", localStorage.getItem("fbclid") || "");
    setField("_fbp", getCookie("_fbp") || "");
    setField("_fbc", getCookie("_fbc") || "");
  }

  function registerTracking() {
    document.querySelectorAll("[data-track]").forEach(function (node) {
      node.addEventListener("click", function () {
        var source = node.getAttribute("data-track") || "cta";
        if (source.indexOf("phone") === 0) {
          trackMeta("Contact", {
            content_name: source,
            content_category: "Phone Click"
          });
        }

        trackMeta("LeadCTA", { placement: source }, "trackCustom");
      });
    });

    if (form) {
      form.addEventListener("focusin", onFormStart, { once: true });
      form.addEventListener("input", onFormStart, { once: true });
      form.addEventListener("submit", onSubmit);
    }

    trackScrollDepth();
  }

  function onFormStart() {
    if (formStarted) {
      return;
    }

    formStarted = true;
    trackMeta("InitiateCheckout", {
      content_name: "quote_form",
      content_category: "Lead Form"
    });
    trackMeta("LeadFormStart", { form_id: "quote-form" }, "trackCustom");
    trackMeta("SubmitForm", { form_id: "quote-form" }, "trackCustom");
  }

  async function onSubmit(event) {
    event.preventDefault();

    var formData = new FormData(form);
    var payload = Object.fromEntries(formData.entries());
    var eventId = createEventId();

    payload.event_id = eventId;
    payload.submitted_at = new Date().toISOString();
    setField("event_id", eventId);
    setField("submitted_at", payload.submitted_at);

    if (!payload.name || !payload.phone || !payload.project_type) {
      setStatus("Please complete name, phone, and project type.", true);
      trackMeta("LeadFormError", { reason: "missing_required_fields" }, "trackCustom");
      return;
    }

    var leadEndpoint = config.leadEndpoint;
    if (!leadEndpoint || leadEndpoint === "REPLACE_WITH_FORM_ENDPOINT") {
      setStatus("Set your form endpoint in SITE_CONFIG before running ads.", true);
      return;
    }

    try {
      var response = await submitLead(leadEndpoint, payload);
      if (!response.ok) {
        throw new Error("Lead submit failed");
      }

      if (pixelReady) {
        trackMeta("Lead", {
          content_name: payload.project_type || "Concrete Project",
          content_category: "Concrete Estimate",
          value: 1,
          currency: "USD"
        }, "track", {
          eventID: eventId
        });
      }

      trackMeta("LeadFormSuccess", {
        project_type: payload.project_type || "unknown",
        timeline: payload.timeline || "unknown"
      }, "trackCustom");
      trackMeta("Schedule", {
        content_name: "estimate_request",
        content_category: payload.project_type || "unknown"
      }, "trackCustom");

      form.reset();
      hydrateHiddenFields();
      setStatus("Thanks. Your request was sent.", false);
      window.setTimeout(function () {
        window.location.href = config.thankYouUrl || "thank-you.html";
      }, 500);
    } catch (error) {
      setStatus("We couldn't submit the form. Please call us instead.", true);
      trackMeta("LeadFormError", { reason: "submit_failed" }, "trackCustom");
    }
  }

  function submitLead(url, payload) {
    var mode = config.leadEndpointMode || "json";

    if (mode === "form") {
      var body = new URLSearchParams(payload);
      return fetch(url, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: body.toString()
      });
    }

    return fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  function setStatus(message, isError) {
    if (!statusEl) {
      return;
    }

    statusEl.textContent = message;
    statusEl.style.color = isError ? "#8d2a14" : "#2e5b4f";
  }

  function setField(name, value) {
    var field = form && form.querySelector('[name="' + name + '"]');
    if (field) {
      field.value = value;
    }
  }

  function trackMeta(name, params, method, options) {
    if (!pixelReady) {
      return;
    }

    var fbMethod = method || "track";
    if (options) {
      window.fbq(fbMethod, name, params || {}, options);
      return;
    }
    window.fbq(fbMethod, name, params || {});
  }

  function createEventId() {
    return "lead_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  }

  function trackScrollDepth() {
    var thresholds = [25, 50, 75];
    var fired = {};

    window.addEventListener("scroll", function () {
      var doc = document.documentElement;
      var scrollTop = doc.scrollTop || document.body.scrollTop;
      var scrollHeight = doc.scrollHeight - doc.clientHeight;
      var percent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 100;

      thresholds.forEach(function (threshold) {
        if (percent >= threshold && !fired[threshold]) {
          fired[threshold] = true;
          trackMeta("ScrollDepth", { percent: threshold }, "trackCustom");
        }
      });
    }, { passive: true });
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : "";
  }

  function loadOverrides() {
    try {
      return JSON.parse(localStorage.getItem("95_concrete_settings") || "{}");
    } catch (error) {
      return {};
    }
  }

  function mergeConfig(base, overrides) {
    var merged = {};
    Object.keys(base).forEach(function (key) {
      merged[key] = base[key];
    });
    Object.keys(overrides || {}).forEach(function (key) {
      if (overrides[key] !== "" && overrides[key] !== null && typeof overrides[key] !== "undefined") {
        merged[key] = overrides[key];
      }
    });
    return merged;
  }

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + expires + "; path=/; SameSite=Lax";
  }
})();
