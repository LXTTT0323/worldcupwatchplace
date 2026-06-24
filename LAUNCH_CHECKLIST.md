# WorldCupWatchPlace Launch Checklist

## Current Launch Readiness

- Backend: deployable Node HTTP service.
- Extension: MV3 side panel prototype, configurable API base.
- Live data: Google Places, Google Distance Matrix, Google Time Zone, Ticketmaster Discovery API.
- Eventbrite: token authentication works, but public event search is unavailable for normal tokens; keep as import/owned-event source.
- Reddit: request submitted; do not block launch on approval.

## Before Public Chrome Web Store Submission

1. Deploy backend to a public HTTPS URL.
2. Update `worldcupwatchplace-extension/config.js`:
   ```js
   window.WCWP_CONFIG = {
     API_BASE: "https://your-api-domain"
   };
   ```
3. Update `worldcupwatchplace-extension/manifest.json` host permissions with the same API domain.
4. Add extension icons: 16x16, 32x32, 48x48, 128x128.
5. Create a short privacy policy page:
   - Uses location only to search nearby venues.
   - Stores watch-list and feedback locally unless submitted as venue signal.
   - Does not sell personal data.
   - External APIs used: Google Maps/Places, Ticketmaster, optional Reddit/X/Yelp if enabled.
6. Rebuild the extension zip and upload to Chrome Web Store.

## Recommended MVP Launch Scope

- Launch as a limited beta / unlisted extension first.
- Keep copy honest:
  - `Event listing`: strongest signal.
  - `Fan posts`: only match-level social evidence.
  - `Likely ... spot`: venue fit, not confirmed.
  - `Call to confirm`: no match-level evidence yet.
- Prioritize user feedback buttons after launch:
  - `Right place`
  - `Not showing`
  - `Too crowded`
  - `Can reserve`

## Production Notes

- Do not put API keys in extension files.
- Store backend API keys as cloud environment variables.
- Use HTTPS only for the production backend.
- Render/Railway/Fly/Cloud Run all work for the current backend shape.
