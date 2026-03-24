# 95 Concrete Landing Page

Static landing page for GitHub Pages with Meta Pixel-ready lead tracking.

## Files

- `index.html`: main landing page
- `site-config.js`: editable site defaults used across the funnel
- `site.js`: shared Meta/page tracking and dynamic message matching
- `styles.css`: page styles
- `script.js`: landing page form submit logic and attribution capture
- `services.html`, `about.html`, `contact.html`: supporting funnel pages
- `thank-you.html`: post-submit page
- `privacy.html`: basic privacy page
- `og-image.svg`: social share image

## Before running traffic

Update `window.SITE_CONFIG` in `site-config.js`, or use `/admin.html`:

- `phoneDisplay`: business phone shown on the page
- `phoneLink`: phone number in E.164 format without spaces, for example `+15555550195`
- `serviceArea`: local market served by 95 Concrete
- `metaPixelId`: your Meta Pixel ID
- `leadEndpoint`: your form endpoint
- `leadEndpointMode`: use `json` for webhook-style endpoints or `form` for tools expecting URL-encoded form posts
- `heroHeadline`, `heroSubheadline`, `ctaText`, `ctaNote`: core ad-landing copy
- `reviewUrl`, `mapsUrl`: optional trust links

## Meta events implemented

- `PageView`: base pixel page load
- `ViewContent`: funnel page viewed
- `Lead`: successful form submit
- `Contact`: phone clicks
- `CTAInteraction`: custom event for CTA button clicks
- `FunnelPageView`: custom event for page-level funnel tracking
- `LeadFormView`: custom event when the quote form enters view
- `LeadFormStart`: custom event on first form interaction
- `QuoteRequestSubmitted`: custom event on successful submit
- `LeadFormError`: custom event on validation or submit failure
- `LeadConfirmationView`: custom event on the thank-you page

## Attribution captured with each lead

- page URL
- page title
- landing page
- referrer
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `utm_term`
- `fbclid`
- `_fbp`
- `_fbc`
- `event_id`
- submission timestamp

## Hosting on GitHub Pages

1. Create a GitHub repository.
2. Push these files to the default branch.
3. In GitHub repository settings, enable GitHub Pages from the branch root.
4. Add your real Pixel ID and lead endpoint before sending traffic.

## Settings page

- Admin page: `/admin.html`
- Password: `95concrete`
- Settings are stored in the browser with `localStorage`, so this is a convenience gate, not secure authentication.
- The admin page now also controls hero copy, CTA copy, trust links, Pixel ID, and form endpoint.

## Recommended next step

For stronger Meta attribution, pair this page with Conversions API on the endpoint that receives the form submission and reuse the same `event_id` for deduplication.
