(function () {
  var config = (window.getSiteConfig && window.getSiteConfig()) || window.SITE_CONFIG || {};
  var form = document.getElementById("quote-form");
  var statusEl = document.getElementById("form-status");
  var formStarted = false;
  var identityTimer = null;
  var fieldFocusTracked = {};
  var fieldCompleteTracked = {};
  var progressTracked = {};
  var optionalDetailsTracked = false;

  if (!form) {
    return;
  }

  persistAttribution();
  hydrateHiddenFields();
  registerFormTracking();

  function persistAttribution() {
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"].forEach(function (field) {
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
        setCookie("_fbc", "fb.1." + Date.now() + "." + fbclid, 90);
      }
    }
  }

  function hydrateHiddenFields() {
    var tracking = getTrackingContext();
    setField("page_url", window.location.href);
    setField("page_title", document.title);
    setField("landing_page", localStorage.getItem("landing_page") || window.location.href);
    setField("referrer", localStorage.getItem("referrer") || document.referrer || "");
    setField("utm_source", tracking.utm_source || "");
    setField("utm_medium", tracking.utm_medium || "");
    setField("utm_campaign", tracking.utm_campaign || "");
    setField("utm_content", tracking.utm_content || "");
    setField("utm_term", tracking.utm_term || "");
    setField("fbclid", tracking.fbclid || "");
    setField("_fbp", getCookie("_fbp") || "");
    setField("_fbc", getCookie("_fbc") || "");
    setField("event_source_url", tracking.event_source_url || window.location.href);
    setField("external_id", tracking.external_id || "");
    setField("session_id", tracking.session_id || "");
    setField("visitor_id", tracking.visitor_id || "");
    setField("matched_project", tracking.matched_project || "");
    setField("browser_language", navigator.language || "");
    setField("screen_size", getScreenSize());
    setField("viewport_size", getViewportSize());
    setField("browser_timezone", getTimezone());
  }

  function registerFormTracking() {
    form.addEventListener("focusin", onFormStart, { once: true });
    form.addEventListener("input", onFormStart, { once: true });
    form.addEventListener("focusin", onFieldFocus);
    form.addEventListener("input", onFieldInput);
    form.addEventListener("change", onFieldChange);
    form.addEventListener("submit", onSubmit);

    var optionalFields = form.querySelector(".optional-fields");
    if (optionalFields) {
      optionalFields.addEventListener("toggle", onOptionalToggle);
    }
  }

  function onFormStart() {
    if (formStarted) {
      return;
    }

    formStarted = true;
    trackMeta("LeadFormStart", {
      form_id: "quote-form"
    }, "trackCustom");
  }

  function scheduleIdentitySync() {
    if (identityTimer) {
      window.clearTimeout(identityTimer);
    }

    identityTimer = window.setTimeout(function () {
      syncIdentityFromForm();
    }, 300);
  }

  function onFieldFocus(event) {
    var fieldName = getTrackableFieldName(event.target);
    if (!fieldName || fieldFocusTracked[fieldName]) {
      return;
    }

    fieldFocusTracked[fieldName] = true;
    trackMeta("LeadFieldFocus", {
      field_name: fieldName
    }, "trackCustom");
  }

  function onFieldInput(event) {
    scheduleIdentitySync();
    trackFieldCompletion(event.target);
    trackFormProgress();
  }

  function onFieldChange(event) {
    trackFieldCompletion(event.target);
    trackFormProgress();
  }

  function onOptionalToggle(event) {
    if (event.target.open && !optionalDetailsTracked) {
      optionalDetailsTracked = true;
      trackMeta("OptionalDetailsOpen", {
        form_id: "quote-form"
      }, "trackCustom");
    }
  }

  async function syncIdentityFromForm() {
    var values = Object.fromEntries(new FormData(form).entries());
    var identity = await buildHashedIdentity(values);

    if (identity.em || identity.ph || identity.fn) {
      setField("hashed_email", identity.em || "");
      setField("hashed_phone", identity.ph || "");
      setField("hashed_fn", identity.fn || "");

      if (typeof window.storeMetaIdentity === "function") {
        window.storeMetaIdentity(identity);
      }
    }
  }

  async function onSubmit(event) {
    event.preventDefault();

    var payload = Object.fromEntries(new FormData(form).entries());
    var tracking = getTrackingContext();
    var eventId = createEventId();
    var identity = await buildHashedIdentity(payload);

    payload.event_id = eventId;
    payload.submitted_at = new Date().toISOString();
    payload.event_source_url = tracking.event_source_url || window.location.href;
    payload.external_id = tracking.external_id || "";
    payload.session_id = tracking.session_id || "";
    payload.visitor_id = tracking.visitor_id || "";
    payload.hashed_email = identity.em || "";
    payload.hashed_phone = identity.ph || "";
    payload.hashed_fn = identity.fn || "";

    setField("event_id", payload.event_id);
    setField("submitted_at", payload.submitted_at);
    setField("event_source_url", payload.event_source_url);
    setField("external_id", payload.external_id);
    setField("session_id", payload.session_id);
    setField("visitor_id", payload.visitor_id);
    setField("hashed_email", payload.hashed_email);
    setField("hashed_phone", payload.hashed_phone);
    setField("hashed_fn", payload.hashed_fn);

    if (!payload.name || !payload.phone || !payload.project_type) {
      setStatus("Please complete name, phone, and project type.", true);
      trackMeta("LeadFormError", {
        reason: "missing_required_fields"
      }, "trackCustom");
      return;
    }

    if (!config.leadEndpoint || config.leadEndpoint === "REPLACE_WITH_FORM_ENDPOINT") {
      setStatus("Set your form endpoint in the admin page before running ads.", true);
      trackMeta("LeadFormError", {
        reason: "missing_endpoint"
      }, "trackCustom");
      return;
    }

    if (typeof window.storeMetaIdentity === "function") {
      window.storeMetaIdentity(identity);
    }

    try {
      var response = await submitLead(payload);
      if (!response.ok) {
        throw new Error("Lead submit failed");
      }

      trackMeta("Lead", {
        content_name: payload.project_type || "Concrete Project",
        content_category: "Concrete Estimate",
        value: 1,
        currency: "USD",
        external_id: payload.external_id
      }, "track", { eventID: eventId });

      trackMeta("QuoteRequestSubmitted", {
        project_type: payload.project_type || "unknown",
        timeline: payload.timeline || "unknown",
        external_id: payload.external_id
      }, "trackCustom");

      form.reset();
      hydrateHiddenFields();
      setStatus("Thanks. Your request was sent.", false);
      window.setTimeout(function () {
        window.location.href = config.thankYouUrl || "thank-you.html";
      }, 350);
    } catch (error) {
      setStatus("We could not submit the form. Please call instead.", true);
      trackMeta("LeadFormError", {
        reason: "submit_failed"
      }, "trackCustom");
    }
  }

  function submitLead(payload) {
    var mode = config.leadEndpointMode || "json";

    if (mode === "form") {
      return fetch(config.leadEndpoint, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: new URLSearchParams(payload).toString()
      });
    }

    return fetch(config.leadEndpoint, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  function getTrackingContext() {
    if (typeof window.getMetaTrackingContext === "function") {
      return window.getMetaTrackingContext();
    }

    return {
      event_source_url: window.location.href,
      external_id: "",
      session_id: "",
      visitor_id: "",
      matched_project: "",
      utm_source: localStorage.getItem("utm_source") || "",
      utm_medium: localStorage.getItem("utm_medium") || "",
      utm_campaign: localStorage.getItem("utm_campaign") || "",
      utm_content: localStorage.getItem("utm_content") || "",
      utm_term: localStorage.getItem("utm_term") || "",
      fbclid: localStorage.getItem("fbclid") || getParam("fbclid") || ""
    };
  }

  function trackFieldCompletion(node) {
    var fieldName = getTrackableFieldName(node);
    if (!fieldName || fieldCompleteTracked[fieldName]) {
      return;
    }

    var value = getFieldValue(node);
    if (!value) {
      return;
    }

    fieldCompleteTracked[fieldName] = true;
    trackMeta("LeadFieldComplete", {
      field_name: fieldName,
      field_required: node.hasAttribute("required") ? 1 : 0
    }, "trackCustom");
  }

  function trackFormProgress() {
    var completed = 0;
    ["name", "phone", "project_type"].forEach(function (fieldName) {
      var node = form.querySelector('[name="' + fieldName + '"]');
      if (node && getFieldValue(node)) {
        completed += 1;
      }
    });

    [
      { count: 1, pct: 33 },
      { count: 2, pct: 67 },
      { count: 3, pct: 100 }
    ].forEach(function (milestone) {
      if (completed >= milestone.count && !progressTracked[milestone.count]) {
        progressTracked[milestone.count] = true;
        trackMeta("LeadFormProgress", {
          fields_complete: milestone.count,
          progress_pct: milestone.pct
        }, "trackCustom");
      }
    });
  }

  function getTrackableFieldName(node) {
    if (!node || !node.name) {
      return "";
    }

    var skip = {
      page_url: true,
      page_title: true,
      landing_page: true,
      referrer: true,
      utm_source: true,
      utm_medium: true,
      utm_campaign: true,
      utm_content: true,
      utm_term: true,
      fbclid: true,
      _fbp: true,
      _fbc: true,
      event_id: true,
      submitted_at: true,
      event_source_url: true,
      external_id: true,
      session_id: true,
      visitor_id: true,
      matched_project: true,
      hashed_email: true,
      hashed_phone: true,
      hashed_fn: true,
      browser_language: true,
      screen_size: true,
      viewport_size: true,
      browser_timezone: true
    };

    return skip[node.name] ? "" : node.name;
  }

  function getFieldValue(node) {
    return (node.value || "").trim();
  }

  async function buildHashedIdentity(values) {
    return {
      em: await sha256(normalizeEmail(values.email)),
      ph: await sha256(normalizePhone(values.phone)),
      fn: await sha256(normalizeFirstName(values.name))
    };
  }

  function normalizeEmail(value) {
    return (value || "").trim().toLowerCase();
  }

  function normalizePhone(value) {
    return (value || "").replace(/\D+/g, "");
  }

  function normalizeFirstName(value) {
    return (value || "").trim().toLowerCase().split(/\s+/)[0] || "";
  }

  async function sha256(value) {
    if (!value || !window.crypto || !window.crypto.subtle) {
      return "";
    }

    var data = new TextEncoder().encode(value);
    var hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer)).map(function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function setStatus(message, isError) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = message;
    statusEl.style.color = isError ? "#8d2a14" : "#2e5b4f";
  }

  function setField(name, value) {
    var field = form.querySelector('[name="' + name + '"]');
    if (field) {
      field.value = value;
    }
  }

  function trackMeta(name, params, method, options) {
    if (typeof window.trackMetaEvent !== "function") {
      return;
    }
    window.trackMetaEvent(name, params || {}, method, options);
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : "";
  }

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + expires + "; path=/; SameSite=Lax";
  }

  function createEventId() {
    return "lead_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  }

  function getScreenSize() {
    return [window.screen.width, window.screen.height].join("x");
  }

  function getViewportSize() {
    return [window.innerWidth, window.innerHeight].join("x");
  }

  function getTimezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch (error) {
      return "";
    }
  }
})();
