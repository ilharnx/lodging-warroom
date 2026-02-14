import type { ScrapedListing } from "@/types";
import { extractAirbnbId } from "./detect";

// Known public Airbnb API key (used by their web client)
const AIRBNB_API_KEY = "d306zoyjsyarp7ifhu67rjxn52tv0t20";

/** Ensure Airbnb image URLs are high-resolution */
function airbnbImgHiRes(url: string): string {
  if (!url) return url;
  // Remove existing size params and add high-res
  const base = url.split("?")[0];
  if (base.includes("muscache.com")) {
    return base + "?im_w=1200";
  }
  return url;
}

export async function scrapeAirbnb(url: string): Promise<ScrapedListing> {
  const externalId = extractAirbnbId(url);

  // Strategy 1: Try the Airbnb v2 API
  if (externalId) {
    try {
      const apiResult = await fetchAirbnbApi(externalId);
      if (apiResult && apiResult.name && apiResult.name.length > 3) {
        console.log(`Airbnb API success for ${externalId}: "${apiResult.name}", ${apiResult.photos?.length || 0} photos`);
        return apiResult;
      }
    } catch (err) {
      console.error("Airbnb API attempt failed:", err);
    }
  }

  // Strategy 2: Scrape the HTML page (desktop UA)
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Sec-Ch-Ua":
          '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
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
    console.log(`Airbnb HTML fetched: ${html.length} chars`);
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
  // Try multiple API formats for better data
  const formats = ["for_native", "v1.8.0"];

  for (const format of formats) {
    try {
      const apiUrl = `https://www.airbnb.com/api/v2/listings/${listingId}?_format=${format}&key=${AIRBNB_API_KEY}&locale=en`;

      const res = await fetch(apiUrl, {
        headers: {
          "User-Agent":
            "Airbnb/24.10 iPhone/17.4.1 Type/Phone",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "X-Airbnb-API-Key": AIRBNB_API_KEY,
          "X-Airbnb-Supports-Airlock-V2": "true",
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.log(`Airbnb API (${format}) returned ${res.status}`);
        continue;
      }

      const data = await res.json();
      const listing = data?.listing;
      if (!listing) continue;

      const result = parseApiListing(listing, listingId);
      if (result.name && result.name.length > 3) {
        return result;
      }
    } catch (err) {
      console.error(`Airbnb API (${format}) error:`, err);
    }
  }

  return null;
}

/** Parse listing data from the v2 API response */
function parseApiListing(
  listing: Record<string, unknown>,
  listingId: string
): ScrapedListing {
  const result: ScrapedListing = {
    name: (listing.name as string) || (listing.title as string) || "",
    source: "airbnb",
    externalId: listingId,
    description: (listing.description as string) || (listing.space as string) || undefined,
    lat: (listing.lat as number) || 0,
    lng: (listing.lng as number) || 0,
    bedrooms: (listing.bedrooms as number) || undefined,
    bathrooms: (listing.bathrooms as number) || undefined,
    rating: (listing.star_rating as number) || undefined,
    reviewCount: (listing.review_count as number) || (listing.reviews_count as number) || undefined,
    address: (listing.public_address as string) || (listing.smart_location as string) || undefined,
    neighborhood: (listing.neighborhood_overview as string)
      ? undefined
      : (listing.city as string) || undefined,
    currency: (listing.price_native_currency as string) || "USD",
  };

  // Price
  if (listing.price_native) {
    result.perNight = listing.price_native as number;
  } else if (listing.price) {
    result.perNight = listing.price as number;
  }

  // Photos — check multiple field structures
  const photos: { url: string; caption?: string }[] = [];
  const seenUrls = new Set<string>();

  const rawPhotos = listing.photos as Array<Record<string, unknown>> | undefined;
  if (rawPhotos && Array.isArray(rawPhotos)) {
    for (const p of rawPhotos.slice(0, 30)) {
      // Direct URL fields
      const url =
        (p.xl_picture_url as string) ||
        (p.picture_url as string) ||
        (p.picture as string) ||
        (p.large as string) ||
        (p.original as string) ||
        (p.large_cover as string) || "";

      // Also check nested urls object
      const urls = p.urls as Record<string, string> | undefined;
      const nestedUrl = urls?.xl_picture_url || urls?.large || urls?.medium || "";

      const finalUrl = airbnbImgHiRes(url || nestedUrl);
      if (finalUrl && !seenUrls.has(finalUrl)) {
        seenUrls.add(finalUrl);
        photos.push({ url: finalUrl, caption: (p.caption as string) || undefined });
      }
    }
  }

  // Single cover image fallback
  if (photos.length === 0 && listing.xl_picture_url) {
    photos.push({ url: airbnbImgHiRes(listing.xl_picture_url as string) });
  }
  if (photos.length === 0 && listing.picture_url) {
    photos.push({ url: airbnbImgHiRes(listing.picture_url as string) });
  }

  if (photos.length > 0) result.photos = photos;

  // Amenities
  if (listing.amenities && Array.isArray(listing.amenities)) {
    result.amenities = listing.amenities as string[];
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

  // Try extracting from deferred state script (multiple possible IDs)
  const deferredPatterns = [
    /<script[^>]*id="data-deferred-state-0"[^>]*>([\s\S]*?)<\/script>/,
    /<script[^>]*id="data-deferred-state"[^>]*>([\s\S]*?)<\/script>/,
    /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
  ];

  let jsonData: Record<string, unknown> | null = null;

  for (const pattern of deferredPatterns) {
    if (jsonData) break;
    const match = html.match(pattern);
    if (match) {
      try {
        jsonData = JSON.parse(match[1]);
        console.log(`Airbnb: found embedded JSON via ${pattern.source?.slice(0, 40) || "pattern"}`);
      } catch {
        /* parse failed */
      }
    }
  }

  if (jsonData) {
    extractFromAirbnbJson(jsonData, result);
    console.log(`Airbnb JSON extraction: name="${result.name}", photos=${result.photos?.length || 0}, lat=${result.lat}`);
  }

  // Fallback: extract from meta/title tags
  if (!result.name) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
    if (titleMatch) {
      result.name = titleMatch[1]
        .replace(/\s*[-–|].*Airbnb.*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  if (!result.name) {
    const ogTitleMatch =
      html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/) ||
      html.match(/<meta[^>]*content="([^"]*)"[^>]*property="og:title"/);
    if (ogTitleMatch) {
      result.name = ogTitleMatch[1]
        .replace(/\s*[-–|].*Airbnb.*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  if (!result.name) {
    result.name = `Airbnb Listing ${externalId || ""}`.trim();
  }

  // OG image (only if we have no photos yet)
  if (!result.photos || result.photos.length === 0) {
    const ogImageMatch =
      html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/) ||
      html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/);
    if (ogImageMatch) {
      result.photos = [{ url: airbnbImgHiRes(ogImageMatch[1]) }];
    }
  }

  // OG description
  if (!result.description) {
    const ogDescMatch =
      html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/) ||
      html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:description"/);
    if (ogDescMatch) {
      result.description = ogDescMatch[1].replace(/&amp;/g, "&");
    }
  }

  // Coordinates
  if (result.lat === 0 || result.lng === 0) {
    const latMatch = html.match(/"lat":\s*([-\d.]+)/);
    const lngMatch = html.match(/"lng":\s*([-\d.]+)/);
    if (latMatch && lngMatch) {
      result.lat = parseFloat(latMatch[1]);
      result.lng = parseFloat(lngMatch[1]);
    }
  }

  // Bedroom/bathroom from HTML text
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

  // CDN-based image extraction — find ALL Airbnb image URLs in the page
  // This works even when the structured JSON parsing misses photos
  if (!result.photos || result.photos.length <= 1) {
    const cdnPhotos = extractAirbnbCdnImages(html);
    if (cdnPhotos.length > (result.photos?.length || 0)) {
      result.photos = cdnPhotos;
    }
  }

  console.log(`Airbnb HTML result: name="${result.name}", photos=${result.photos?.length || 0}`);
  return result;
}

/** Extract image URLs from Airbnb's CDN patterns in raw HTML */
function extractAirbnbCdnImages(html: string): { url: string }[] {
  const seenUrls = new Set<string>();
  const photos: { url: string }[] = [];

  // Airbnb image CDN patterns
  const patterns = [
    /https:\/\/a0\.muscache\.com\/im\/pictures\/[a-zA-Z0-9\-/_.]+(?:\?[^"'\s<>]*)?/g,
    /https:\/\/a0\.muscache\.com\/im\/ml\/photo_enhancement\/[a-zA-Z0-9\-/_.]+(?:\?[^"'\s<>]*)?/g,
    /https:\/\/a0\.muscache\.com\/4ea\/air\/v2\/pictures\/[a-zA-Z0-9\-/_.]+(?:\?[^"'\s<>]*)?/g,
  ];

  for (const pattern of patterns) {
    for (const m of html.matchAll(pattern)) {
      if (seenUrls.size >= 30) break;
      let imgUrl = m[0].replace(/&amp;/g, "&");
      // Skip tiny images, avatars, icons
      if (
        imgUrl.includes("avatar") ||
        imgUrl.includes("user") ||
        imgUrl.includes("1x1") ||
        imgUrl.includes("pixel") ||
        imgUrl.includes("icon")
      ) continue;

      // Normalize to high-res
      imgUrl = airbnbImgHiRes(imgUrl);

      // Deduplicate by base path (ignore query params)
      const basePath = imgUrl.split("?")[0];
      if (!seenUrls.has(basePath)) {
        seenUrls.add(basePath);
        photos.push({ url: imgUrl });
      }
    }
  }

  return photos;
}

function extractFromAirbnbJson(
  data: Record<string, unknown>,
  result: ScrapedListing
): void {
  const flat = flattenObject(data);

  // Name — try specific listing title patterns first
  for (const [key, val] of Object.entries(flat)) {
    if (
      typeof val === "string" &&
      val.length > 5 &&
      val.length < 200 &&
      !result.name &&
      (
        key.includes("listingTitle") ||
        key.includes("listing.title") ||
        key.includes("listing.name") ||
        (key.endsWith(".title") && key.includes("stayProduct"))
      )
    ) {
      result.name = val;
      break;
    }
  }

  // Broader name fallback
  if (!result.name) {
    for (const [key, val] of Object.entries(flat)) {
      if (
        (key.endsWith(".title") || key.endsWith(".name")) &&
        typeof val === "string" &&
        val.length > 5 &&
        val.length < 200
      ) {
        result.name = val;
        break;
      }
    }
  }

  // Photos — look for ALL image URLs (mediaItems, photos, pictures, baseUrl, etc.)
  const photos: { url: string; caption?: string }[] = [];
  const seenUrls = new Set<string>();

  for (const [key, val] of Object.entries(flat)) {
    if (
      typeof val === "string" &&
      val.startsWith("http") &&
      val.includes("muscache.com") &&
      !val.includes("avatar") &&
      !val.includes("user") &&
      !val.includes("1x1") &&
      (
        key.endsWith(".baseUrl") ||
        key.endsWith(".url") ||
        key.endsWith(".picture_url") ||
        key.endsWith(".xl_picture_url") ||
        key.endsWith(".pictureUrl") ||
        key.includes("mediaItems") ||
        key.includes("photo") ||
        key.includes("picture") ||
        key.includes("image")
      )
    ) {
      const hiRes = airbnbImgHiRes(val);
      const basePath = hiRes.split("?")[0];
      if (!seenUrls.has(basePath)) {
        seenUrls.add(basePath);

        // Try to find a caption for this photo
        const captionKey = key.replace(/\.(?:baseUrl|url|picture_url|xl_picture_url|pictureUrl)$/, ".caption");
        const caption = flat[captionKey];

        photos.push({
          url: hiRes,
          caption: typeof caption === "string" ? caption : undefined,
        });
      }
    }
    if (photos.length >= 30) break;
  }

  if (photos.length > 0) {
    result.photos = photos;
  }

  // Rating & reviews
  for (const [key, val] of Object.entries(flat)) {
    if (
      (key.includes("rating") || key.includes("Rating")) &&
      (key.includes("value") || key.includes("Value") || key.endsWith(".rating")) &&
      typeof val === "number" &&
      val > 0 &&
      val <= 5
    ) {
      result.rating = val;
      break;
    }
  }
  for (const [key, val] of Object.entries(flat)) {
    if (
      (key.includes("reviewCount") || key.includes("review_count") || key.includes("reviewsCount")) &&
      typeof val === "number" &&
      val > 0
    ) {
      result.reviewCount = val;
      break;
    }
  }

  // Bedrooms & Bathrooms
  for (const [key, val] of Object.entries(flat)) {
    if (
      (key.includes("bedroom") || key.includes("Bedroom")) &&
      (key.includes("count") || key.includes("Count") || key.endsWith(".bedrooms")) &&
      typeof val === "number" &&
      val > 0
    ) {
      result.bedrooms = val;
      break;
    }
  }
  for (const [key, val] of Object.entries(flat)) {
    if (
      (key.includes("bathroom") || key.includes("Bathroom")) &&
      (key.includes("count") || key.includes("Count") || key.endsWith(".bathrooms")) &&
      typeof val === "number" &&
      val > 0
    ) {
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
      (key.includes("amount") || key.includes("Amount") || key.includes("total")) &&
      typeof val === "number" &&
      val > 0 &&
      val < 100000
    ) {
      if (!result.perNight) result.perNight = val;
    }
  }

  // Description
  if (!result.description) {
    for (const [key, val] of Object.entries(flat)) {
      if (
        (key.includes("description") || key.includes("Description") || key.includes("summary")) &&
        typeof val === "string" &&
        val.length > 30 &&
        val.length < 5000
      ) {
        result.description = val;
        break;
      }
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
