# WorldCupWatchPlace

WorldCupWatchPlace is a Chrome extension and lightweight API for finding nearby bars, restaurants, and public screens to watch World Cup matches with other fans.

The product is built around a simple promise: help a fan decide where to go quickly, while clearly separating confirmed event listings from likely watch spots that should be called before leaving.

## What Is Included

- `extension/` - Chrome Extension source for the side panel experience.
- `backend/` - Node.js API for match data, venue recommendations, driving distance, feedback, privacy policy, and the landing page.
- `store-assets/` - Chrome Web Store screenshot assets.
- `DATA_STRATEGY.md` - Data-source strategy and API tradeoffs.
- `LAUNCH_CHECKLIST.md` - Launch checklist used for the first Chrome Web Store submission.

## Live Links

- Website: https://worldcupwatchplace-api.onrender.com/
- Privacy policy: https://worldcupwatchplace-api.onrender.com/privacy
- API health: https://worldcupwatchplace-api.onrender.com/api/health
- Chrome Web Store item ID: `lfldfjappaoefoekgbpggldhhhjlaabd`

## Local Backend

```powershell
cd backend
npm install
$env:PORT="8788"
$env:GOOGLE_MAPS_API_KEY="optional-google-maps-key"
$env:TICKETMASTER_API_KEY="optional-ticketmaster-key"
npm start
```

Without API keys, the backend falls back to open data sources where possible. Production deployments should use backend-only environment variables; do not put API keys in the Chrome extension package.

## Local Extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `extension/` folder.

The checked-in `extension/config.js` points to the live Render API. Change it only if you are running a local backend.

## Data Sources

The backend can use:

- Google Places, Geocoding, Time Zone, and Distance Matrix
- Ticketmaster Discovery API
- Optional Eventbrite, Yelp, Reddit, and X connectors when credentials and access are available
- Open World Cup match data from `openfootball/worldcup.json`

## Privacy

Location is used only when the user chooses Near me. Watch list and preferences are stored in browser storage. Venue feedback can be sent to the backend to improve venue confidence signals. See `/privacy` for the public policy.

## License

MIT
