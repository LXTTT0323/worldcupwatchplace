# WorldCupWatchPlace Data Strategy

## Product Truth

The product should never claim a venue is confirmed unless the signal comes from:

- merchant claim
- user confirmation
- platform verification
- trusted event listing

Google Places, OpenStreetMap, Yelp, reviews, and venue names can only produce `Likely` or `Check first`.

## Data Layers

1. Match data
   - Current prototype: openfootball `worldcup.json`
   - Production: Sportradar, Sportmonks, API-Football, SportsDataIO, or another licensed sports feed
   - Needed fields: match id, teams, kickoff UTC, local display time, stage, host city, status

2. Venue candidate data
   - Prototype fallback: Nominatim + Overpass from OpenStreetMap
   - Production default: Google Places Text Search / Nearby Search / Place Details
   - Needed fields: place id, name, address, lat/lng, phone, website, maps URL, opening hours, rating, types, reservable, good for groups, good for watching sports, price range

3. Venue-match signal data
   - This is the defensible data asset.
   - Key shape: `match_id + venue_id + signal_type + status + observed_at + expires_at`
   - Signal types: user_confirmed, merchant_claim, platform_verified, predicted, event_listing

4. Demand data
   - Search, view, save, call, navigate, share, ask-copy, feedback
   - Used for Insights and merchant demand forecasting.

5. User plan events
   - Tracks personal intent without treating it as venue truth.
   - Event types: will_go, called, already_there, removed.
   - These help build "where fans are heading" insights, but they do not create `Confirmed` venue claims.
   - Client behavior: `In my list` toggles removal, `Already there` toggles between will_go and already_there, and watch-list items expand to venue actions and verification.

6. Social signal cache
   - Stores precomputed signals from Reddit, Facebook, X, Xiaohongshu, WeChat groups, and fan communities.
   - The user-facing recommendation request only reads this cache; it should never run several live social searches while the user waits.
   - Signal shape: venue name/place id, city, source list, mention count, social score, short summary, last refreshed timestamp.
   - Yelp is the best fit for near-real-time official local search enrichment. Its Fusion Business Search supports `best_match`, `rating`, `review_count`, and `distance` sort modes.
   - Reddit and X can be searched through official APIs with tokens/rate limits, but should refresh the cache in the background by city/match/team instead of blocking a user search.
   - Facebook public content is limited through Graph API permissions; use merchant pages/events, approved Page Public Content access, or partner/social-listening data.
   - Xiaohongshu does not provide a simple official open search API for this use case; treat it as partner/imported/community-submitted data unless a licensed source is available.

7. Location and time zone data
   - Nearby mode uses browser geolocation when the user grants it.
   - Manual mode geocodes any city, address, hotel, or landmark.
   - Match kickoff display is localized to the searched location's time zone, not the browser's time zone.

## Recommendation Labels

- `Confirmed`: active merchant/user/platform/event signal says the venue is showing the match
- `Likely`: venue fit is strong but no match-level confirmation exists
- `Check first`: real venue candidate, but weak confidence for the selected match

## Fan Decision Fields

Most useful fields for people actually leaving the house:

- confirmed showing signal
- distance and Google Maps link
- reservation status and direct venue website
- phone number for quick confirmation
- open status or listed hours
- rating count as a trust proxy
- social mentions and fan discussion score
- good for groups
- packed/capacity signal
- cover charge or minimum spend
- team fan concentration
- last confirmed timestamp

## MVP Metrics

- User finds a useful place in under 2 minutes
- Top 5 results contain at least 2 `Confirmed` or high-quality `Likely` venues in seeded cities
- Confirmed false-positive rate under 10-15%
- At least 0.3 useful signals contributed per active search user
- 20+ merchant-claimed venues per launch city

## Current Implementation

- Backend: `outputs/worldcupwatchplace-backend`
- Extension: `outputs/worldcupwatchplace-extension`
- Local API: `http://127.0.0.1:8788`
- Preview: `http://127.0.0.1:8097/preview.html`

## Current Sort Modes

- `recommended`: confidence score, confirmation signals, venue fit, social buzz, and distance as a tie-breaker
- `distance`: nearest first, using the same venue pool

## Current Venue Type Modes

- all watch spots
- sports bar
- restaurants
- Chinese
- Italian
- Korean
- izakaya
- Mexican
- Indian
- Thai / Vietnamese
- Cafe / light food
- Western
- public big screen

Venue type is sent to the backend as `category`. It changes the Google Places text-search queries, so selecting Korean or Chinese should fetch more matching restaurants instead of merely filtering the original sports-bar pool.
For public big screen mode, the backend prefers public-space signals such as fan zone, outdoor screening, plaza, park, square, stadium, or big screen. If a city does not have enough public-screen matches, it falls back to normal watch-party candidates so the user still gets useful options.

## API Feasibility Notes

- Automatic connectors are now wired as optional backend environment variables. `TICKETMASTER_API_KEY` creates high-confidence event-listing candidates. `EVENTBRITE_TOKEN` can authenticate account-owned Eventbrite resources, but normal tokens do not support public event search, so it should be treated as owned-event or manual-import data unless public-search access is explicitly available. `X_BEARER_TOKEN` and `REDDIT_BEARER_TOKEN` create match-level fan signals only when a post contains the venue name plus World Cup/team/watch/showing/viewing intent. `YELP_API_KEY` adds restaurant candidates and review metadata.
- Yelp: official Fusion Business Search is the strongest near-real-time supplement. It can sort by best_match, rating, review_count, or distance and return ratings, review counts, categories, price, phone, and hours with an API key.
- Reddit: official API/search can support background refreshes with OAuth/rate limits. Use scheduled city/team/match queries and write summarized venue mentions into `social_signals.json` or a production table.
- X: official recent search can find recent public posts with a bearer token, but access/rate limits vary by tier. Treat it as background refresh, not a user-blocking request.
- Facebook: Graph API is not a general open public-post search engine for this use case. Use merchant pages/events, approved Page Public Content access, or social-listening partners.
- Xiaohongshu: no simple official open venue search API for this prototype. Use partner data, manual imports, creator submissions, or a compliant third-party source.

Without a Google key, the backend uses OpenStreetMap fallback. With `GOOGLE_MAPS_API_KEY`, it switches to Google Places.
