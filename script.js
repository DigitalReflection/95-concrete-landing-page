(function () {
  var config = (window.getSiteConfig && window.getSiteConfig()) || window.SITE_CONFIG || {};
  var form = document.getElementById("quote-form");
  var statusEl = document.getElementById("form-status");
  var formStarted = false;

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

  function registerFormTracking() {
    form.addEventListener("focusin", onFormStart, { once: true });
    form.addEventListener("input", onFormStart, { once: true });
    form.addEventListener("submit", onSubmit);
  }

  function onFormStart() {
    if (formStarted) {
      return;
    }

    formStarted = true;
    trackMeta("LeadFormStart", { form_id: "quote-form" }, "trackCustom");
  }

  async function onSubmit(event) {
    event.preventDefault();

    var payload = Object.fromEntries(new FormData(form).entries());
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

    if (!config.leadEndpoint || config.leadEndpoint === "REPLACE_WITH_FORM_ENDPOINT") {
      setStatus("Set your form endpoint in the admin page before running ads.", true);
      trackMeta("LeadFormError", { reason: "missing_endpoint" }, "trackCustom");
      return;
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
        currency: "USD"
      }, "track", { eventID: eventId });

      trackMeta("QuoteRequestSubmitted", {
        project_type: payload.project_type || "unknown",
        timeline: payload.timeline || "unknown"
      }, "trackCustom");

      form.reset();
      hydrateHiddenFields();
      setStatus("Thanks. Your request was sent.", false);
      window.setTimeout(function () {
        window.location.href = config.thankYouUrl || "thank-you.html";
      }, 350);
    } catch (error) {
      setStatus("We could not submit the form. Please call instead.", true);
      trackMeta("LeadFormError", { reason: "submit_failed" }, "trackCustom");
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
})();
