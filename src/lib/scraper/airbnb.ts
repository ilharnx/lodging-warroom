import type { ScrapedListing } from "@/types";
import { extractAirbnbId } from "./detect";

/**
 * Scrape an Airbnb listing by fetching the page HTML and extracting
 * the embedded JSON data from the __NEXT_DATA__ or deferred-state script tags.
 *
 * This is a best-effort scraper. Airbnb frequently changes their page structure.
 * When scraping fails, the listing falls back to manual entry.
 */
export async function scrapeAirbnb(url: string): Promise<ScrapedListing> {
  const externalId = extractAirbnbId(url);

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
        Pragma: "no-cache",
        "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
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
    console.error("Airbnb scrape error:", error);
    // Return minimal data so the listing still shows up
    return {
      name: `Airbnb Listing ${externalId || ""}`.trim(),
      source: "airbnb",
      externalId: externalId || undefined,
      lat: 0,
      lng: 0,
    };
  }
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
  // Try __NEXT_DATA__
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

  // Fallback: extract from meta tags
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
    result.name = `Airbnb Listing ${externalId || ""}`.trim();
  }

  // Extract OG image as fallback photo
  const ogImageMatch = html.match(
    /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/
  );
  if (ogImageMatch && (!result.photos || result.photos.length === 0)) {
    result.photos = [{ url: ogImageMatch[1], category: "exterior" }];
  }

  // Extract OG description
  if (!result.description) {
    const ogDescMatch = html.match(
      /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/
    );
    if (ogDescMatch) {
      result.description = ogDescMatch[1];
    }
  }

  // Extract coordinates from OG meta or page content
  const latMatch = html.match(/"lat":\s*([-\d.]+)/);
  const lngMatch = html.match(/"lng":\s*([-\d.]+)/);
  if (latMatch && lngMatch) {
    result.lat = parseFloat(latMatch[1]);
    result.lng = parseFloat(lngMatch[1]);
  }

  return result;
}

function extractFromAirbnbJson(
  data: Record<string, unknown>,
  result: ScrapedListing
): void {
  // Deep search through the JSON for known keys
  const flat = flattenObject(data);

  // Name / title
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
      key.includes("photo") &&
      key.endsWith(".baseUrl") &&
      typeof val === "string" &&
      val.startsWith("http")
    ) {
      photos.push({ url: val });
    } else if (
      key.includes("picture") &&
      key.endsWith(".baseUrl") &&
      typeof val === "string" &&
      val.startsWith("http")
    ) {
      photos.push({ url: val });
    }
  }
  if (photos.length > 0) {
    result.photos = photos;
  }

  // Rating
  for (const [key, val] of Object.entries(flat)) {
    if (key.includes("rating") && key.includes("value") && typeof val === "number") {
      result.rating = val;
      break;
    }
  }

  // Review count
  for (const [key, val] of Object.entries(flat)) {
    if (key.includes("reviewCount") && typeof val === "number") {
      result.reviewCount = val;
      break;
    }
  }

  // Bedrooms
  for (const [key, val] of Object.entries(flat)) {
    if (key.includes("bedroom") && key.includes("count") && typeof val === "number") {
      result.bedrooms = val;
      break;
    }
  }

  // Bathrooms
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
      if (!result.perNight) {
        result.perNight = val;
      }
    }
  }
}

/** Flatten a nested object into dot-notation keys */
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
