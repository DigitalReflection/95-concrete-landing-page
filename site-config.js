window.SITE_CONFIG = {
  companyName: "95 Concrete",
  ownerName: "Jake",
  phoneDisplay: "(555) 555-0195",
  phoneLink: "+15555550195",
  serviceArea: "Your service area here",
  metaPixelId: "REPLACE_WITH_META_PIXEL_ID",
  leadEndpoint: "REPLACE_WITH_FORM_ENDPOINT",
  leadEndpointMode: "json",
  thankYouUrl: "thank-you.html",
  pageTitle: "95 Concrete | Veteran-Owned Driveways, Patios, Slabs, and Repairs",
  pageDescription: "Veteran-owned concrete contractor for driveways, patios, sidewalks, slabs, repairs, and replacement work. Ask for Jake for a fast estimate.",
  heroHeadline: "Driveways, patios, and slab work with owner-led follow-up from Jake.",
  heroSubheadline: "95 Concrete is built for fast mobile estimates. Clean pours, straight answers, and a clear next step from first tap to callback.",
  ctaText: "Get Free Estimate",
  ctaNote: "Fast mobile estimate. No runaround. Ask for Jake.",
  responsePromise: "Owner-led follow-up and straightforward estimates.",
  reviewLabel: "Read reviews",
  reviewUrl: "",
  mapsUrl: ""
};

window.getSiteConfig = function () {
  var overrides = {};
  try {
    overrides = JSON.parse(localStorage.getItem("95_concrete_settings") || "{}");
  } catch (error) {
    overrides = {};
  }

  var config = {};
  Object.keys(window.SITE_CONFIG).forEach(function (key) {
    config[key] = window.SITE_CONFIG[key];
  });
  Object.keys(overrides).forEach(function (key) {
    if (overrides[key] !== "" && overrides[key] !== null && typeof overrides[key] !== "undefined") {
      config[key] = overrides[key];
    }
  });
  return config;
};
