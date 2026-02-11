import type { Platform, ScrapedListing } from "@/types";

/**
 * Generic scraper for VRBO, Booking.com, and unknown platforms.
 * Extracts data from OpenGraph meta tags, JSON-LD, and page content.
 */
export async function scrapeGeneric(
  url: string,
  platform: Platform
): Promise<ScrapedListing> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return parseGenericHtml(html, url, platform);
  } catch (error) {
    console.error(`Generic scrape error for ${url}:`, error);
    return {
      name: `Listing from ${platform}`,
      source: platform,
      lat: 0,
      lng: 0,
    };
  }
}

function parseGenericHtml(
  html: string,
  url: string,
  platform: Platform
): ScrapedListing {
  const result: ScrapedListing = {
    name: "",
    source: platform,
    lat: 0,
    lng: 0,
  };

  // Extract from OpenGraph meta tags
  const ogTitle = extractMeta(html, "og:title");
  const ogDesc = extractMeta(html, "og:description");
  const ogImage = extractMeta(html, "og:image");

  result.name = ogTitle || extractTitle(html) || `Listing from ${platform}`;
  result.description = ogDesc || undefined;

  if (ogImage) {
    result.photos = [{ url: ogImage, category: "exterior" }];
  }

  // Try JSON-LD structured data
  const jsonLdMatches = html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
  );

  for (const match of jsonLdMatches) {
    try {
      const ld = JSON.parse(match[1]);
      extractFromJsonLd(ld, result);
    } catch {
      /* parse failed */
    }
  }

  // Try to find coordinates in page content
  const latMatch = html.match(/"lat(?:itude)?":\s*([-\d.]+)/);
  const lngMatch = html.match(/"(?:lng|longitude)":\s*([-\d.]+)/);
  if (latMatch && lngMatch) {
    result.lat = parseFloat(latMatch[1]);
    result.lng = parseFloat(lngMatch[1]);
  }

  // Extract all image URLs if we don't have photos yet
  if (!result.photos || result.photos.length === 0) {
    const imgMatches = html.matchAll(/<img[^>]+src="(https?:\/\/[^"]+)"/g);
    const images: { url: string }[] = [];
    for (const imgMatch of imgMatches) {
      if (images.length >= 20) break;
      const src = imgMatch[1];
      // Filter out tiny images (icons, tracking pixels)
      if (!src.includes("pixel") && !src.includes("1x1") && !src.includes("tracking")) {
        images.push({ url: src });
      }
    }
    if (images.length > 0) {
      result.photos = images;
    }
  }

  return result;
}

function extractMeta(html: string, property: string): string | null {
  const match = html.match(
    new RegExp(`<meta[^>]*property="${property}"[^>]*content="([^"]*)"`)
  );
  if (match) return match[1];

  // Try name attribute too
  const nameMatch = html.match(
    new RegExp(`<meta[^>]*name="${property}"[^>]*content="([^"]*)"`)
  );
  return nameMatch ? nameMatch[1] : null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/);
  return match ? match[1].trim() : null;
}

function extractFromJsonLd(
  ld: Record<string, unknown>,
  result: ScrapedListing
): void {
  if (!ld || typeof ld !== "object") return;

  const type = ld["@type"] as string | undefined;

  if (
    type === "LodgingBusiness" ||
    type === "Hotel" ||
    type === "VacationRental" ||
    type === "House" ||
    type === "Apartment"
  ) {
    if (ld.name && typeof ld.name === "string") {
      result.name = ld.name;
    }
    if (ld.description && typeof ld.description === "string") {
      result.description = ld.description;
    }

    const geo = ld.geo as Record<string, unknown> | undefined;
    if (geo) {
      if (geo.latitude) result.lat = Number(geo.latitude);
      if (geo.longitude) result.lng = Number(geo.longitude);
    }

    const rating = ld.aggregateRating as Record<string, unknown> | undefined;
    if (rating) {
      if (rating.ratingValue) result.rating = Number(rating.ratingValue);
      if (rating.reviewCount) result.reviewCount = Number(rating.reviewCount);
    }

    const address = ld.address as Record<string, unknown> | undefined;
    if (address) {
      const parts = [
        address.streetAddress,
        address.addressLocality,
        address.addressRegion,
      ].filter(Boolean);
      result.address = parts.join(", ");
    }

    if (ld.image) {
      const images = Array.isArray(ld.image) ? ld.image : [ld.image];
      result.photos = images
        .filter((img): img is string => typeof img === "string")
        .map((url) => ({ url }));
    }
  }

  // Handle offers for pricing
  if (ld.offers || (ld as Record<string, unknown>).priceRange) {
    const offers = ld.offers as Record<string, unknown> | undefined;
    if (offers && offers.price) {
      result.perNight = Number(offers.price);
    }
  }
}
