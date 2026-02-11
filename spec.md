# Lodging War Room — Product Spec

## What This Is

A web app that lets a group of friends compare vacation rental listings from any platform (Airbnb, VRBO, Booking.com, etc.) in one place, on one map, with all the information that actually matters when deciding where to stay.

**The core interaction is dead simple:**
1. Paste a listing URL → the app scrapes everything automatically
2. OR upload/paste a Google Sheet of URLs → bulk scrape
3. Everything appears on an interactive map with rich cards
4. Friends can vote, comment, filter, compare

**Trip context:** 4 adults + 2 three-year-olds. Destination: Barbados (but the app should work for any destination).

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | Next.js (App Router) + React | SSR, API routes in one project |
| Map | Mapbox GL JS or Google Maps JS API | Interactive, satellite view, smooth UX |
| Scraping | Playwright (headless Chromium) | Airbnb/VRBO are JS-heavy SPAs, need real browser |
| Image classification | OpenAI Vision API or Claude API | Auto-tag photos as bedroom/bathroom/kitchen/exterior/pool |
| Database | SQLite via Prisma (or Supabase if you want real-time) | Simple, no infra overhead |
| Hosting | Vercel (frontend) + Railway or Fly.io (scraper worker) | Vercel can't run Playwright, needs separate worker |
| Auth | None initially — share via URL. Optional: simple passcode per trip | Keep friction at zero |

---

## Data Model

```prisma
model Trip {
  id          String    @id @default(cuid())
  name        String    // "Barbados 2026"
  destination String    // "Barbados"
  centerLat   Float     // Map center
  centerLng   Float
  adults      Int       @default(4)
  kids        Int       @default(2)
  nights      Int?      // If known, for cost calculations
  checkIn     DateTime?
  checkOut    DateTime?
  listings    Listing[]
  createdAt   DateTime  @default(now())
}

model Listing {
  id              String    @id @default(cuid())
  tripId          String
  trip            Trip      @relation(fields: [tripId], references: [id])

  // Source
  url             String
  source          String    // "airbnb" | "vrbo" | "booking" | "other"
  externalId      String?   // Platform-specific ID

  // Core info (scraped)
  name            String
  description     String?
  totalCost       Float?    // Total for the trip
  perNight        Float?
  cleaningFee     Float?
  serviceFee      Float?
  taxes           Float?
  currency        String    @default("USD")

  // Location (scraped + geocoded)
  address         String?
  neighborhood    String?
  lat             Float
  lng             Float

  // The Big 4 — what people actually care about
  bedrooms        Int?
  beds            Json?     // [{ type: "King", count: 1 }, { type: "Queen", count: 2 }]
  bathrooms       Float?
  bathroomNotes   String?   // "2 ensuite, 1 half bath, outdoor shower"
  kitchen         String?   // "full" | "kitchenette" | "microwave" | "none"
  kitchenDetails  String?   // "Full kitchen with dishwasher, gas stove, Nespresso"

  // Photos (scraped + classified)
  photos          Photo[]

  // Amenities (scraped)
  amenities       Json?     // ["pool", "wifi", "ac", "washer", "dryer", ...]

  // Kid stuff
  kidFriendly     Boolean   @default(false)
  kidNotes        String?   // "Pool fence, crib available, highchair"
  beachType       String?   // "calm" | "moderate" | "waves" | "none"
  beachDistance    String?   // "2 min walk" | "beachfront" | "10 min drive"

  // Reviews (scraped)
  rating          Float?
  reviewCount     Int?

  // Social
  votes           Vote[]
  comments        Comment[]
  addedBy         String?

  // Meta
  scrapeStatus    String    @default("pending") // "pending" | "scraping" | "done" | "failed"
  scrapeError     String?
  lastScraped     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Photo {
  id          String   @id @default(cuid())
  listingId   String
  listing     Listing  @relation(fields: [listingId], references: [id])
  url         String
  category    String?  // "exterior" | "bedroom" | "bathroom" | "kitchen" | "pool" | "view" | "living" | "other"
  caption     String?
  sortOrder   Int      @default(0)
}

model Vote {
  id        String   @id @default(cuid())
  listingId String
  listing   Listing  @relation(fields: [listingId], references: [id])
  userName  String
  value     Int      // 1 or -1
  createdAt DateTime @default(now())

  @@unique([listingId, userName]) // One vote per person per listing
}

model Comment {
  id        String   @id @default(cuid())
  listingId String
  listing   Listing  @relation(fields: [listingId], references: [id])
  userName  String
  text      String
  createdAt DateTime @default(now())
}
```

---

## Scraping Engine

This is the hardest part and the most important. Each platform structures data differently.

### Scraper Architecture

```
User pastes URL
  → API route receives URL
  → Detect platform (airbnb.com, vrbo.com, booking.com, etc.)
  → Dispatch to platform-specific scraper
  → Playwright loads page in headless browser
  → Extract structured data
  → Geocode address if coordinates not found
  → Download all photos
  → Classify photos via Vision API
  → Save everything to DB
  → Return listing to frontend via WebSocket or polling
```

### Platform-Specific Scrapers

#### Airbnb
- URL pattern: `airbnb.com/rooms/{id}`
- Data lives in `<script id="data-deferred-state-0">` JSON blob and/or `__NEXT_DATA__`
- Key paths in the JSON:
  - Title, description
  - Price breakdown (check the booking widget or the `PdpPricingDetails` section)
  - Photos array with captions
  - Location (lat/lng usually in the data, sometimes need to parse from map)
  - Bedrooms/beds breakdown in the "sleeping arrangements" section
  - Amenities list
  - Reviews summary
- **Important:** Airbnb aggressively blocks scrapers. Use:
  - Rotating residential proxies
  - Realistic browser fingerprinting
  - Random delays between requests
  - Consider using their mobile API endpoints as fallback

#### VRBO
- URL pattern: `vrbo.com/{id}` or `vrbo.com/vacation-rentals/{id}`
- Data often in `window.__INITIAL_STATE__` or similar JSON blob
- Similar structure to Airbnb but different field names
- Generally less aggressive anti-scraping than Airbnb

#### Booking.com
- URL pattern: `booking.com/hotel/{region}/{name}.html`
- Heavy server-side rendering, data in HTML + some JSON-LD
- Photos in a carousel, need to expand "show all photos"
- Price requires selecting dates

#### Generic Fallback
- For any URL that doesn't match known platforms
- Use OpenGraph meta tags, JSON-LD structured data
- Fall back to page title + any images found
- Mark as "needs manual review" — user fills in missing fields

### Photo Classification

After downloading all photos from a listing, run them through a vision model to auto-categorize:

```
Categories:
- exterior (the building/property from outside)
- bedroom (any sleeping area)
- bathroom (any bathroom/shower)
- kitchen (cooking area, appliances)
- pool (pool, hot tub)
- living (living room, common areas)
- view (scenic views from the property)
- dining (dining area, outdoor eating)
- other

Prompt for vision model:
"Classify this vacation rental photo into exactly one category:
exterior, bedroom, bathroom, kitchen, pool, living, view, dining, other.
Return only the category name."
```

This lets the frontend show "Bedroom Photos" | "Bathroom Photos" | "Kitchen Photos" tabs on each listing card.

### Google Sheets Import

Accept a Google Sheet URL or CSV upload with columns:
- `url` (required) — the listing URL
- Any other columns are treated as manual overrides (name, notes, etc.)

Process:
1. Parse the sheet/CSV
2. For each row with a URL, queue a scrape job
3. Show progress: "Scraping 3 of 12..."
4. Manual override columns take precedence over scraped data

---

## Frontend

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Barbados 2026 Lodging HQ               [+ Add] [Import]│
├───────────────────────────────────────────────────────────┤
│  Filters: [Source] [Price] [Beds] [Kitchen] ...          │
├──────────────────────────────┬────────────────────────────┤
│                              │  ┌──────────────────────┐  │
│                              │  │ Listing Card 1       │  │
│         INTERACTIVE MAP      │  │ $3,200 total         │  │
│                              │  │ 3bed/2bath/full kit  │  │
│         (Mapbox/Google)      │  │ 5 votes  [View]      │  │
│                              │  └──────────────────────┘  │
│                              │  ┌──────────────────────┐  │
│         Pins show price      │  │ Listing Card 2       │  │
│         Click = highlight    │  │ ...                  │  │
│                              │  └──────────────────────┘  │
│                              │                            │
├──────────────────────────────┴────────────────────────────┤
│  Mobile: map on top, cards below (scrollable)             │
└───────────────────────────────────────────────────────────┘
```

### Map Features
- Satellite / street toggle
- Price shown on each pin
- Click pin → card scrolls into view + highlights
- Click card → map pans to pin
- Cluster pins if zoomed out
- Color pins by: source platform, vote count, or price range
- Draw radius circles (e.g., "within 5 min walk of beach")
- Show nearby POIs: restaurants, grocery stores, beaches (from Google Places API)

### Listing Card — Expanded View

When you click a card, it expands (or opens a modal) with THE BIG 4:

```
┌─────────────────────────────────────────────────────────┐
│  Beach House Paradise              Airbnb  4.8 (127)     │
│  Christ Church, South Coast                              │
│  $3,200 total ($457/night x 7)     Per person: $800     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Photo Gallery — filterable by room type]               │
│  [ALL] [Bedrooms] [Bathrooms] [Kitchen] [Pool] [Views]  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  BEDROOMS (3)                                           │
│  - Master: King bed, ensuite bathroom, AC                │
│  - Room 2: Queen bed, AC                                 │
│  - Room 3: 2 Twin beds (good for toddler setup)         │
│                                                          │
│  BATHROOMS (2.5)                                        │
│  - Master ensuite: full bath + walk-in shower            │
│  - Shared: shower only                                   │
│  - Half bath: toilet + sink downstairs                   │
│                                                          │
│  KITCHEN: Full kitchen                                   │
│  Dishwasher, full-size fridge, gas stove, oven,          │
│  Nespresso, blender, toaster. Well-stocked.              │
│                                                          │
│  BEACH: 2 min walk, calm shallow water                   │
│                                                          │
│  KID STUFF: Pool fence, Crib, Highchair                 │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  AMENITIES: Pool, AC, WiFi, Washer/Dryer, Parking,      │
│  BBQ Grill, Beach Chairs, Snorkeling Gear                │
├─────────────────────────────────────────────────────────┤
│  Comments                                                │
│  Alf: "This is the one. Kitchen is legit."               │
│  Sarah: "Worried about the road noise mentioned in..."   │
│  [Add comment...]                                        │
├─────────────────────────────────────────────────────────┤
│  [View Original Listing]              [Remove]           │
└─────────────────────────────────────────────────────────┘
```

### Filters

All filters are combinable (AND logic):

| Filter | Type | Options |
|--------|------|---------|
| Source | Multi-select chips | Airbnb, VRBO, Booking, Other |
| Price range | Dual slider | $0 — $max (total cost) |
| Bedrooms | Min selector | 1+, 2+, 3+, 4+ |
| Bathrooms | Min selector | 1+, 1.5+, 2+, 2.5+ |
| Kitchen | Multi-select | Full, Kitchenette, Any |
| Kid-friendly | Toggle | Show only kid-friendly |
| Beach distance | Select | Beachfront, <5 min walk, <10 min |
| Rating | Min selector | 4+, 4.5+, 4.8+ |
| Has pool | Toggle | |
| Sort by | Select | Price (low-high), Votes (high-low), Rating, Recently added |

### Mobile Experience

This will get used on phones a lot. Key mobile decisions:
- Map takes top 40% of screen, cards scroll below
- Swipe up on cards to go full-screen list
- Tap map pin → card slides up as bottom sheet
- Add listing form: same flow, just stacked vertically
- Photo gallery: full-screen swipe

---

## Adding Listings — The Two Flows

### Flow 1: Paste a URL

```
[User clicks "+ Add Listing"]
  → Modal with single input: "Paste listing URL"
  → User pastes: https://www.airbnb.com/rooms/12345678
  → Button: "Scrape It"
  → Loading state with progress:
    "Fetching listing..."
    "Extracting details..."
    "Downloading photos..."
    "Classifying rooms..."
    "Geocoding location..."
  → Card appears with all data populated
  → User can edit any field before saving
  → Optional: add name, notes, "added by"
  → Save
```

**Important:** After scraping, show the user a preview of what was extracted and let them correct anything before saving. The scraper won't be perfect.

### Flow 2: Bulk Import from Google Sheet

```
[User clicks "Import"]
  → Option A: Paste Google Sheet URL (must be publicly viewable)
  → Option B: Upload CSV file
  → App reads the sheet, shows preview:
    "Found 8 URLs. Ready to scrape?"
  → "Scrape All" button
  → Progress bar: "Scraping 3 of 8..."
  → Each listing appears on the map as it completes
```

---

## Cost Calculations

Since there are 4 adults splitting costs:

```
Per person = Total cost / number of adults
Per person per night = Per night / number of adults
```

Show both "total" and "per person" prominently. The group doesn't care about the abstract per-night — they care about "what's my share."

Also calculate and show:
- Cost breakdown: nightly rate x nights + cleaning fee + service fee + taxes
- "Hidden costs" callout if cleaning/service fees are >15% of nightly total

---

## API Routes

```
POST   /api/trips                    — Create a trip
GET    /api/trips/:id                — Get trip with all listings
POST   /api/trips/:id/listings       — Add listing (paste URL, triggers scrape)
POST   /api/trips/:id/import         — Bulk import from sheet/CSV
GET    /api/listings/:id             — Get single listing
PATCH  /api/listings/:id             — Update listing (manual edits)
DELETE /api/listings/:id             — Remove listing
POST   /api/listings/:id/vote        — Vote on listing
POST   /api/listings/:id/comments    — Add comment
GET    /api/scrape/status/:jobId     — Poll scrape job status
```

---

## Scraping Considerations & Fallbacks

### Anti-Scraping Defenses
Airbnb especially is hostile to scraping. Mitigation strategies:
1. **Residential proxies** — Use a service like Bright Data or Oxylabs
2. **Browser fingerprint rotation** — Playwright with stealth plugin
3. **Rate limiting** — Max 1 request per 5 seconds per proxy
4. **Caching** — Never re-scrape the same URL within 24 hours
5. **User-Agent rotation** — Pool of realistic UAs
6. **Fallback to API endpoints** — Some platforms have undocumented mobile APIs that are less protected

### When Scraping Fails
1. Show what was captured (even if partial)
2. Let the user manually fill in the rest
3. At minimum, embed the URL as an iframe preview or screenshot
4. Mark the listing as "partial data — click to complete"

### Legal Note
Web scraping for personal use (trip planning with friends) is generally fine. This isn't a commercial product reselling data. But don't hammer their servers — be respectful with rate limits.

---

## Nice-to-Haves (Phase 2)

- **Side-by-side comparison:** Select 2-3 listings, see them in columns
- **"Winner" designation:** Mark the final pick, archive the rest
- **Calendar overlay:** Show availability if scrapeable
- **Nearby POIs on map:** Toggle restaurants, grocery stores, beaches, hospitals
- **Push notifications:** When someone adds a new listing or votes
- **Screenshot/PDF export:** "Here's our shortlist" to send to the group
- **Price tracking:** Re-scrape periodically and alert if price drops
- **Review highlights:** Pull top 3 most-helpful reviews from the listing
- **AI summary:** "This is a 3-bed beachfront villa that's great for families. The kitchen is fully stocked. Main concern from reviews: road noise at night."

---

## Environment Variables

```env
# Map
NEXT_PUBLIC_MAPBOX_TOKEN=...      # or GOOGLE_MAPS_API_KEY

# Scraping
PROXY_URL=...                     # Residential proxy for Playwright
OPENAI_API_KEY=...                # For photo classification (or use Claude)
ANTHROPIC_API_KEY=...             # Alternative for photo classification

# Database
DATABASE_URL=file:./dev.db        # SQLite for dev, Postgres URL for prod

# Optional
GOOGLE_SHEETS_API_KEY=...         # For reading public sheets
```
