window.SITE_CONFIG = {
  companyName: "95 Concrete",
  phoneDisplay: "(555) 555-0195",
  phoneLink: "+15555550195",
  serviceArea: "Your service area here",
  metaPixelId: "REPLACE_WITH_META_PIXEL_ID",
  leadEndpoint: "REPLACE_WITH_FORM_ENDPOINT",
  leadEndpointMode: "json",
  thankYouUrl: "thank-you.html",
  pageTitle: "95 Concrete | Concrete Driveways, Patios, Slabs, and Repairs",
  pageDescription: "95 Concrete is a veteran-owned concrete contractor building and replacing driveways, patios, sidewalks, slabs, and repairs.",
  heroHeadline: "Concrete driveways, patios, slabs, and repairs from 95 Concrete.",
  heroSubheadline: "Fast response, clean work, durable pours, and a mobile-first estimate form built for Facebook traffic.",
  ctaText: "Get Free Estimate",
  ctaNote: "Takes about 30 seconds. No pressure. We follow up fast.",
  responsePromise: "Fast callback and straightforward estimates.",
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
