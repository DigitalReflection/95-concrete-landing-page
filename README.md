# 95 Concrete Landing Page

Static landing page for GitHub Pages with Meta Pixel-ready lead tracking.

## Files

- `index.html`: main landing page
- `styles.css`: page styles
- `script.js`: attribution capture, form submit logic, Meta event tracking
- `thank-you.html`: post-submit page
- `privacy.html`: basic privacy page

## Before running traffic

Update `window.SITE_CONFIG` in `index.html`:

- `phoneDisplay`: business phone shown on the page
- `phoneLink`: phone number in E.164 format without spaces, for example `+15555550195`
- `serviceArea`: local market served by 95 Concrete
- `metaPixelId`: your Meta Pixel ID
- `leadEndpoint`: your form endpoint
- `leadEndpointMode`: use `json` for webhook-style endpoints or `form` for tools expecting URL-encoded form posts

## Meta events implemented

- `PageView`: base pixel page load
- `ViewContent`: landing page viewed
- `Lead`: successful form submit
- `Contact`: phone clicks
- `InitiateCheckout`: first form interaction, used here as lead-form-start signal
- `LeadCTA`: custom event for CTA button clicks
- `LeadFormStart`: custom event on first form interaction
- `LeadFormSuccess`: custom event on successful submit
- `LeadFormError`: custom event on validation or submit failure
- `ScrollDepth`: custom event at 25%, 50%, and 75%

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

## Recommended next step

For stronger Meta attribution, pair this page with Conversions API on the endpoint that receives the form submission and reuse the same `event_id` for deduplication.
