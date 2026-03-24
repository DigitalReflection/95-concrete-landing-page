(function () {
  var config = (window.getSiteConfig && window.getSiteConfig()) || window.SITE_CONFIG || {};
  var pixelId = config.metaPixelId;

  if (!pixelId || pixelId === "REPLACE_WITH_META_PIXEL_ID") {
    return;
  }

  var visitorId = getOrCreateLocalId("95_concrete_visitor_id", "visitor_");
  var sessionId = getOrCreateSessionId("95_concrete_session_id", "session_");
  var identity = loadStoredIdentity();

  identity.external_id = identity.external_id || visitorId;

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

  if (!window.__META_PIXEL_INIT__) {
    window.fbq("init", pixelId, identity);
    window.fbq("track", "PageView");
    window.__META_PIXEL_INIT__ = true;
  }

  window.__META_BOOTSTRAP__ = {
    pixelReady: true,
    pixelId: pixelId,
    sessionId: sessionId,
    visitorId: visitorId
  };

  function getOrCreateLocalId(key, prefix) {
    var existing = localStorage.getItem(key);
    if (existing) {
      return existing;
    }

    var value = prefix + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, value);
    return value;
  }

  function getOrCreateSessionId(key, prefix) {
    var existing = sessionStorage.getItem(key);
    if (existing) {
      return existing;
    }

    var value = prefix + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem(key, value);
    return value;
  }

  function loadStoredIdentity() {
    try {
      return JSON.parse(localStorage.getItem("95_concrete_meta_identity") || "{}");
    } catch (error) {
      return {};
    }
  }
})();
