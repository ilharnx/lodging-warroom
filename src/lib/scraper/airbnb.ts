import type { ScrapedListing } from "@/types";
import { extractAirbnbId } from "./detect";

// Known public Airbnb API key (used by their web client)
const AIRBNB_API_KEY = "d306zoyjsyarp7ifhu67rjxn52tv0t20";

export async function scrapeAirbnb(url: string): Promise<ScrapedListing> {
  const externalId = extractAirbnbId(url);

  // Strategy 1: Try the Airbnb v2 API (most reliable)
  if (externalId) {
    try {
      const apiResult = await fetchAirbnbApi(externalId);
      if (apiResult && apiResult.name && apiResult.name.length > 3) {
        return apiResult;
      }
    } catch (err) {
      console.error("Airbnb API attempt failed:", err);
    }
  }

  // Strategy 2: Scrape the HTML page
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Sec-Ch-Ua":
          '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return parseAirbnbHtml(html, url, externalId);
  } catch (error) {
    console.error("Airbnb HTML scrape error:", error);
    return {
      name: `Airbnb Listing ${externalId || ""}`.trim(),
      source: "airbnb",
      externalId: externalId || undefined,
      lat: 0,
      lng: 0,
    };
  }
}

/** Fetch listing data from Airbnb's v2 API (returns structured JSON) */
async function fetchAirbnbApi(
  listingId: string
): Promise<ScrapedListing | null> {
  const apiUrl = `https://www.airbnb.com/api/v2/listings/${listingId}?_format=for_native&key=${AIRBNB_API_KEY}&locale=en`;

  const res = await fetch(apiUrl, {
    headers: {
      "User-Agent":
        "Airbnb/23.49 iPhone/17.4 Type/Phone",
      Accept: "application/json",
      "Accept-Language": "en-US",
      "X-Airbnb-API-Key": AIRBNB_API_KEY,
    },
  });

  if (!res.ok) {
    console.log(`Airbnb API returned ${res.status}`);
    return null;
  }

  const data = await res.json();
  const listing = data?.listing;
  if (!listing) return null;

  const result: ScrapedListing = {
    name: listing.name || listing.title || "",
    source: "airbnb",
    externalId: listingId,
    description: listing.description || listing.space || undefined,
    lat: listing.lat || 0,
    lng: listing.lng || 0,
    bedrooms: listing.bedrooms || undefined,
    bathrooms: listing.bathrooms || undefined,
    rating: listing.star_rating || undefined,
    reviewCount: listing.review_count || listing.reviews_count || undefined,
    address: listing.public_address || listing.smart_location || undefined,
    neighborhood: listing.neighborhood_overview
      ? undefined
      : listing.city || undefined,
    currency: listing.price_native_currency || "USD",
  };

  // Price
  if (listing.price_native) {
    result.perNight = listing.price_native;
  } else if (listing.price) {
    result.perNight = listing.price;
  }

  // Photos
  if (listing.photos && Array.isArray(listing.photos)) {
    result.photos = listing.photos
      .slice(0, 20)
      .map(
        (p: { xl_picture_url?: string; picture?: string; large?: string }) => ({
          url: p.xl_picture_url || p.picture || p.large || "",
        })
      )
      .filter((p: { url: string }) => p.url);
  } else if (listing.xl_picture_url) {
    result.photos = [{ url: listing.xl_picture_url }];
  }

  // Amenities
  if (listing.amenities && Array.isArray(listing.amenities)) {
    result.amenities = listing.amenities;
  }

  // Kitchen detection from amenities
  if (result.amenities && Array.isArray(result.amenities)) {
    const amenLower = result.amenities.map((a: string) =>
      typeof a === "string" ? a.toLowerCase() : ""
    );
    if (amenLower.some((a: string) => a.includes("kitchen") && !a.includes("kitchenette"))) {
      result.kitchen = "full";
    } else if (amenLower.some((a: string) => a.includes("kitchenette"))) {
      result.kitchen = "kitchenette";
    }
    if (amenLower.some((a: string) => a.includes("pool"))) {
      // noted in amenities
    }
  }

  return result;
}

function parseAirbnbHtml(
  html: string,
  url: string,
  externalId: string | null
): ScrapedListing {
  const result: ScrapedListing = {
    name: "",
    source: "airbnb",
    externalId: externalId || undefined,
    lat: 0,
    lng: 0,
  };

  // Try extracting from deferred state script
  const deferredMatch = html.match(
    /<script[^>]*id="data-deferred-state-0"[^>]*>([\s\S]*?)<\/script>/
  );
  const nextDataMatch = html.match(
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/
  );

  let jsonData: Record<string, unknown> | null = null;

  if (deferredMatch) {
    try {
      jsonData = JSON.parse(deferredMatch[1]);
    } catch {
      /* parse failed */
    }
  }
  if (!jsonData && nextDataMatch) {
    try {
      jsonData = JSON.parse(nextDataMatch[1]);
    } catch {
      /* parse failed */
    }
  }

  if (jsonData) {
    extractFromAirbnbJson(jsonData, result);
  }

  // Fallback: extract from meta/title tags
  if (!result.name) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
    if (titleMatch) {
      result.name = titleMatch[1]
        .replace(/- Airbnb$/, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  if (!result.name) {
    // OG title
    const ogTitleMatch =
      html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/) ||
      html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:title"/);
    if (ogTitleMatch) {
      result.name = ogTitleMatch[1]
        .replace(/- Airbnb$/, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  if (!result.name) {
    result.name = `Airbnb Listing ${externalId || ""}`.trim();
  }

  // OG image
  const ogImageMatch =
    html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/) ||
    html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/);
  if (ogImageMatch && (!result.photos || result.photos.length === 0)) {
    result.photos = [{ url: ogImageMatch[1], category: "exterior" }];
  }

  // OG description
  if (!result.description) {
    const ogDescMatch =
      html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/) ||
      html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:description"/);
    if (ogDescMatch) {
      result.description = ogDescMatch[1];
    }
  }

  // Coordinates
  const latMatch = html.match(/"lat":\s*([-\d.]+)/);
  const lngMatch = html.match(/"lng":\s*([-\d.]+)/);
  if (latMatch && lngMatch) {
    result.lat = parseFloat(latMatch[1]);
    result.lng = parseFloat(lngMatch[1]);
  }

  // Bedroom/bathroom from meta description or HTML
  if (!result.bedrooms) {
    const bedroomMatch = html.match(/(\d+)\s*bedroom/i);
    if (bedroomMatch) result.bedrooms = parseInt(bedroomMatch[1]);
  }
  if (!result.bathrooms) {
    const bathroomMatch = html.match(/([\d.]+)\s*bath/i);
    if (bathroomMatch) result.bathrooms = parseFloat(bathroomMatch[1]);
  }

  // Price from HTML
  if (!result.perNight) {
    const priceMatch = html.match(/\$(\d[\d,]*)\s*(?:per|\/)\s*night/i);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(/,/g, ""));
      if (price > 10 && price < 100000) result.perNight = price;
    }
  }

  return result;
}

function extractFromAirbnbJson(
  data: Record<string, unknown>,
  result: ScrapedListing
): void {
  const flat = flattenObject(data);

  // Name
  for (const [key, val] of Object.entries(flat)) {
    if (
      (key.endsWith(".title") || key.endsWith(".name")) &&
      typeof val === "string" &&
      val.length > 5 &&
      val.length < 200 &&
      !result.name
    ) {
      result.name = val;
      break;
    }
  }

  // Photos
  const photos: { url: string; caption?: string }[] = [];
  for (const [key, val] of Object.entries(flat)) {
    if (
      (key.includes("photo") || key.includes("picture")) &&
      key.endsWith(".baseUrl") &&
      typeof val === "string" &&
      val.startsWith("http")
    ) {
      photos.push({ url: val });
    }
  }
  if (photos.length > 0) result.photos = photos;

  // Rating & reviews
  for (const [key, val] of Object.entries(flat)) {
    if (key.includes("rating") && key.includes("value") && typeof val === "number") {
      result.rating = val;
      break;
    }
  }
  for (const [key, val] of Object.entries(flat)) {
    if (key.includes("reviewCount") && typeof val === "number") {
      result.reviewCount = val;
      break;
    }
  }

  // Bedrooms & Bathrooms
  for (const [key, val] of Object.entries(flat)) {
    if (key.includes("bedroom") && key.includes("count") && typeof val === "number") {
      result.bedrooms = val;
      break;
    }
  }
  for (const [key, val] of Object.entries(flat)) {
    if (key.includes("bathroom") && key.includes("count") && typeof val === "number") {
      result.bathrooms = val;
      break;
    }
  }

  // Location
  for (const [key, val] of Object.entries(flat)) {
    if (key.endsWith(".lat") && typeof val === "number" && Math.abs(val) > 0.01) {
      result.lat = val;
    }
    if (key.endsWith(".lng") && typeof val === "number" && Math.abs(val) > 0.01) {
      result.lng = val;
    }
  }

  // Price
  for (const [key, val] of Object.entries(flat)) {
    if (
      (key.includes("price") || key.includes("Price")) &&
      key.includes("amount") &&
      typeof val === "number" &&
      val > 0
    ) {
      if (!result.perNight) result.perNight = val;
    }
  }
}

function flattenObject(
  obj: unknown,
  prefix = "",
  maxDepth = 12
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (maxDepth <= 0) return result;

  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (val && typeof val === "object") {
        Object.assign(result, flattenObject(val, newKey, maxDepth - 1));
      } else {
        result[newKey] = val;
      }
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      const newKey = `${prefix}[${i}]`;
      if (item && typeof item === "object") {
        Object.assign(result, flattenObject(item, newKey, maxDepth - 1));
      } else {
        result[newKey] = item;
      }
    });
  }

  return result;
}
