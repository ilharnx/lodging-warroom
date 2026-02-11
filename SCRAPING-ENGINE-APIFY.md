# Scraping Engine — Apify Integration

**Replace the entire "Scraping Engine" section in SPEC.md with this.**

---

## Scraping Engine (Apify)

Instead of building and maintaining Playwright scrapers that fight anti-bot systems, we use Apify's pre-built scraper actors. They handle proxies, CAPTCHAs, fingerprinting, and rate limiting. You just pass a URL, get back JSON.

Cost: ~$0.01-0.05 per listing. For 30 listings on a trip, that's under $2.

### Setup

```bash
npm install apify-client
```

```env
APIFY_API_TOKEN=your_token_here
```

### Architecture

```
User pastes URL
  → API route detects platform from URL
  → Calls the right Apify actor with that URL
  → Polls for completion (or use run-sync endpoint)
  → Maps actor output → our unified Listing schema
  → Geocode if coordinates missing (Google Maps Geocoding API)
  → Classify photos via Claude Vision API
  → Save to DB
  → Return to frontend
```

---

### Platform: Airbnb

**Actor:** `tri_angle/airbnb-scraper` (most maintained, price-per-result model)
**Alt:** `dtrungtin/actor-airbnb-scraper` (OG actor, also solid)

**Input:**
```javascript
const input = {
  "startUrls": [
    { "url": "https://www.airbnb.com/rooms/12345678" }
  ],
  "calendarMonths": 0,  // don't need calendar data
  "addMoreHostInfo": false,
  "currency": "USD",
  "proxyConfiguration": { "useApifyProxy": true },
  "maxListings": 1,
};
```

**What comes back (key fields):**
```javascript
{
  name: "Coral Cove Beach House",
  url: "https://www.airbnb.com/rooms/12345678",
  stars: 4.8,
  numberOfGuests: 8,
  bedrooms: 3,
  beds: 4,
  bathrooms: 2,
  price: { rate: "$457", total: "$3,200", priceItems: [...] },
  images: [
    { url: "https://a0.muscache.com/...", caption: "Living room" },
    { url: "https://a0.muscache.com/...", caption: "Master bedroom" },
    // ... usually 20-40 photos
  ],
  location: { lat: 13.0694, lng: -59.5772 },
  amenities: ["Pool", "Air conditioning", "Kitchen", "Wifi", ...],
  description: "Beautiful beachfront property...",
  host: { name: "Sarah", isSuperhost: true },
  reviews: { count: 127, average: 4.8 },
  roomType: "Entire home/apt",
  // ... lots more
}
```

**Mapping to our schema:**
```typescript
function mapAirbnb(raw: any): Partial<Listing> {
  return {
    name: raw.name,
    url: raw.url,
    source: "Airbnb",
    totalCost: parsePriceTotal(raw.price?.total),    // strip $ and parse
    perNight: parsePriceTotal(raw.price?.rate),
    bedrooms: raw.bedrooms,
    bathrooms: raw.bathrooms,
    beds: raw.beds,
    lat: raw.location?.lat,
    lng: raw.location?.lng,
    rating: raw.stars,
    reviewCount: raw.reviews?.count,
    amenities: normalizeAmenities(raw.amenities),     // lowercase, dedupe
    kitchen: detectKitchenType(raw.amenities),         // "Full Kitchen" | "Kitchenette" | etc
    photos: raw.images?.map((img, i) => ({
      url: img.url,
      caption: img.caption,
      sortOrder: i,
    })),
    description: raw.description,
  };
}
```

---

### Platform: VRBO

**Actor:** `jupri/vrbo-property` (VRBO Scraper 2.5)
**Alt:** `ecomscrape/vrbo-property-search-scraper` (search-based)

VRBO is trickier — most actors are search-based, not single-listing.
For single listing URLs, the approach is:

**Option A:** Use the VRBO actor with a search URL narrowed to that specific property
**Option B:** Use the Expedia/VRBO shared infrastructure — VRBO listings have an
equivalent on Hotels.com/Expedia, so you can cross-reference

**Input:**
```javascript
const input = {
  "urls": [
    "https://www.vrbo.com/12345678"
  ],
  "proxy": { "useApifyProxy": true },
};
```

**Key fields returned:**
```javascript
{
  propertyName: "Sandy Lane Garden Villa",
  bedrooms: 4,
  bathrooms: 3,
  sleeps: 8,
  rating: 4.9,
  reviewCount: 84,
  price: { nightly: 686, total: 4800, currency: "USD" },
  latitude: 13.1756,
  longitude: -59.6380,
  amenities: ["Private pool", "Air conditioning", "Full kitchen", ...],
  images: ["https://images.trvl-media.com/...", ...],
  description: "...",
  propertyType: "House",
}
```

**Mapping:**
```typescript
function mapVRBO(raw: any): Partial<Listing> {
  return {
    name: raw.propertyName,
    source: "VRBO",
    totalCost: raw.price?.total,
    perNight: raw.price?.nightly,
    bedrooms: raw.bedrooms,
    bathrooms: raw.bathrooms,
    lat: raw.latitude,
    lng: raw.longitude,
    rating: raw.rating,
    reviewCount: raw.reviewCount,
    amenities: normalizeAmenities(raw.amenities),
    kitchen: detectKitchenType(raw.amenities),
    photos: raw.images?.map((url, i) => ({
      url, caption: null, sortOrder: i,
    })),
    description: raw.description,
  };
}
```

---

### Platform: Booking.com

**Actor:** `voyager/booking-scraper` (most popular, well-maintained)
**Alt:** `hello.datawizards/booking-scraper`

**Input:**
```javascript
const input = {
  "startUrls": [
    { "url": "https://www.booking.com/hotel/bb/coral-cove.html?checkin=2026-03-15&checkout=2026-03-22" }
  ],
  "proxyConfiguration": { "useApifyProxy": true },
  "getDetails": true,   // IMPORTANT: gets room info, photos, amenities
  "maxPages": 1,
};
```

**Key fields returned:**
```javascript
{
  name: "Coral Cove Beach House",
  url: "https://www.booking.com/hotel/bb/coral-cove.html",
  rating: 8.9,         // Booking uses 1-10 scale
  reviewCount: 127,
  price: 457,
  currency: "USD",
  address: "Highway 1, Christ Church, Barbados",
  latitude: "13.0694",
  longitude: "-59.5772",
  images: ["https://cf.bstatic.com/...", ...],
  facilities: ["Outdoor swimming pool", "Free WiFi", "Kitchen", "Air conditioning", ...],
  rooms: [
    { type: "Deluxe Suite", beds: "1 king bed", price: 457, ... },
    { type: "Standard Room", beds: "2 twin beds", price: 320, ... },
  ],
  description: "...",
}
```

**Mapping:**
```typescript
function mapBooking(raw: any): Partial<Listing> {
  // Booking uses 1-10 rating scale, normalize to 1-5
  const rating5 = raw.rating ? +(raw.rating / 2).toFixed(1) : null;

  return {
    name: raw.name,
    source: "Booking",
    totalCost: raw.price ? raw.price * tripNights : null,
    perNight: raw.price,
    lat: parseFloat(raw.latitude),
    lng: parseFloat(raw.longitude),
    rating: rating5,
    reviewCount: raw.reviewCount,
    amenities: normalizeAmenities(raw.facilities),
    kitchen: detectKitchenType(raw.facilities),
    photos: raw.images?.map((url, i) => ({
      url, caption: null, sortOrder: i,
    })),
    description: raw.description,
    // Extract bedroom/bathroom counts from room data
    bedrooms: extractBedroomCount(raw.rooms),
    bathrooms: extractBathroomCount(raw.rooms, raw.facilities),
  };
}
```

---

### Shared Utilities

```typescript
// Detect platform from URL
function detectPlatform(url: string): "airbnb" | "vrbo" | "booking" | "unknown" {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes("airbnb")) return "airbnb";
  if (host.includes("vrbo")) return "vrbo";
  if (host.includes("booking")) return "booking";
  return "unknown";
}

// Normalize amenity strings across platforms
function normalizeAmenities(raw: string[]): string[] {
  const map: Record<string, string> = {
    "private pool": "pool",
    "outdoor swimming pool": "pool",
    "indoor swimming pool": "pool",
    "swimming pool": "pool",
    "pool": "pool",
    "air conditioning": "ac",
    "a/c": "ac",
    "ac": "ac",
    "wifi": "wifi",
    "free wifi": "wifi",
    "wireless internet": "wifi",
    "kitchen": "kitchen",
    "full kitchen": "kitchen",
    "kitchenette": "kitchenette",
    "washer": "washer",
    "washing machine": "washer",
    "dryer": "dryer",
    "free parking": "parking",
    "parking": "parking",
    "bbq grill": "bbq",
    "barbecue": "bbq",
    "hot tub": "hot_tub",
    "gym": "gym",
    "fitness center": "gym",
    "beach access": "beach_access",
    "beachfront": "beachfront",
    "ocean view": "ocean_view",
    "balcony": "balcony",
    "patio": "patio",
    "dishwasher": "dishwasher",
    "ev charger": "ev_charger",
    "crib": "crib",
    "high chair": "high_chair",
  };
  return [...new Set(
    raw.map(a => map[a.toLowerCase().trim()] || a.toLowerCase().trim())
  )];
}

// Determine kitchen type from amenities
function detectKitchenType(amenities: string[]): string {
  const lower = amenities.map(a => a.toLowerCase());
  if (lower.some(a => a.includes("full kitchen"))) return "Full Kitchen";
  if (lower.some(a => a === "kitchen")) return "Full Kitchen";
  if (lower.some(a => a.includes("kitchenette"))) return "Kitchenette";
  if (lower.some(a => a.includes("microwave"))) return "Microwave Only";
  return "None";
}
```

---

### The Scrape Flow (API Route)

```typescript
// POST /api/trips/:tripId/listings
// Body: { url: string }

import { ApifyClient } from "apify-client";

const apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

async function scrapeListing(url: string, tripNights: number) {
  const platform = detectPlatform(url);

  let actorId: string;
  let input: any;

  switch (platform) {
    case "airbnb":
      actorId = "tri_angle/airbnb-scraper";
      input = {
        startUrls: [{ url }],
        maxListings: 1,
        calendarMonths: 0,
        currency: "USD",
        proxyConfiguration: { useApifyProxy: true },
      };
      break;

    case "vrbo":
      actorId = "jupri/vrbo-property";
      input = {
        urls: [url],
        proxy: { useApifyProxy: true },
      };
      break;

    case "booking":
      actorId = "voyager/booking-scraper";
      input = {
        startUrls: [{ url }],
        getDetails: true,
        maxPages: 1,
        proxyConfiguration: { useApifyProxy: true },
      };
      break;

    default:
      throw new Error(`Unsupported platform: ${url}`);
  }

  // Run the actor and wait for results
  const run = await apify.actor(actorId).call(input, {
    waitSecs: 120,  // wait up to 2 minutes
  });

  // Fetch results
  const { items } = await apify.dataset(run.defaultDatasetId).listItems();

  if (!items.length) {
    throw new Error("Scraper returned no results");
  }

  // Map to our schema
  const raw = items[0];
  switch (platform) {
    case "airbnb": return mapAirbnb(raw);
    case "vrbo": return mapVRBO(raw);
    case "booking": return mapBooking(raw);
  }
}
```

---

### Photo Classification (after scraping)

After scraping, run photos through Claude Vision to auto-tag them:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

async function classifyPhoto(imageUrl: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 20,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "url", url: imageUrl },
        },
        {
          type: "text",
          text: "Classify this vacation rental photo into exactly one category. Respond with ONLY the category name, nothing else: exterior, bedroom, bathroom, kitchen, pool, living, dining, view, other",
        },
      ],
    }],
  });

  return response.content[0].text.trim().toLowerCase();
}

// Classify all photos for a listing (batch, with rate limiting)
async function classifyAllPhotos(photos: { url: string }[]) {
  const results = [];
  for (const photo of photos.slice(0, 30)) {  // cap at 30 photos
    try {
      const category = await classifyPhoto(photo.url);
      results.push({ ...photo, category });
    } catch {
      results.push({ ...photo, category: "other" });
    }
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 200));
  }
  return results;
}
```

---

### Google Sheets Bulk Import

```typescript
// POST /api/trips/:tripId/import
// Body: { sheetUrl: string } or { csvData: string }

import Papa from "papaparse";

async function importFromSheet(sheetUrl: string, tripId: string) {
  // Convert Google Sheets URL to CSV export URL
  const csvUrl = sheetUrl
    .replace(/\/edit.*$/, "/export?format=csv")
    .replace(/\/pub.*$/, "/export?format=csv");

  const response = await fetch(csvUrl);
  const csvText = await response.text();
  const { data } = Papa.parse(csvText, { header: true });

  const jobs = [];
  for (const row of data) {
    const url = row.url || row.URL || row.link || row.Link;
    if (!url || !url.startsWith("http")) continue;

    jobs.push({
      url,
      // Manual overrides from sheet columns
      name: row.name || row.Name || null,
      notes: row.notes || row.Notes || null,
      addedBy: row.addedBy || row["added by"] || null,
    });
  }

  // Queue all scrape jobs
  return jobs.map(job => ({
    ...job,
    status: "pending",
  }));
}
```

---

### Fallback: Unknown Platform

For URLs that don't match Airbnb/VRBO/Booking, we create a partial listing
and let the user fill in details manually:

```typescript
async function handleUnknownPlatform(url: string): Promise<Partial<Listing>> {
  // Try to get OpenGraph data
  const res = await fetch(url);
  const html = await res.text();

  const ogTitle = html.match(/property="og:title" content="([^"]+)"/)?.[1];
  const ogImage = html.match(/property="og:image" content="([^"]+)"/)?.[1];
  const ogDesc = html.match(/property="og:description" content="([^"]+)"/)?.[1];

  return {
    name: ogTitle || "Manual Listing",
    url,
    source: "Other",
    description: ogDesc,
    photos: ogImage ? [{ url: ogImage, category: "exterior", sortOrder: 0 }] : [],
    scrapeStatus: "partial",  // signals to UI: show "complete this listing" prompt
  };
}
```

---

### Environment Variables (Updated)

```env
# Apify
APIFY_API_TOKEN=apify_api_xxxxxxxxxxxxx

# Map
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# Photo classification
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Database
DATABASE_URL=file:./dev.db

# Optional
GOOGLE_SHEETS_API_KEY=...  # only if you want private sheet access
```

### Apify Pricing Notes

- Free tier: $5/month credit (enough for ~100-500 listings)
- Paid: $49/month for more
- For a single trip with 20-30 listings, free tier is plenty
- Each actor has slightly different pricing model (per-result vs compute units)
- The Airbnb actor (tri_angle) is ~$0.015 per result
- Booking actor (voyager) is ~$0.25-2.50 per 1000 results
- VRBO is similar range

For your use case (one trip, ~30 listings total), you'll spend less than $2.
