import type { ScrapedListing } from "@/types";
import { extractVrboId } from "./detect";

/**
 * VRBO-specific scraper. VRBO (Expedia) uses server-rendered React pages
 * with embedded JSON data in script tags and standard OpenGraph meta tags.
 */
export async function scrapeVrbo(url: string): Promise<ScrapedListing> {
  const externalId = extractVrboId(url);

  try {
    const response = await fetch(url, {
      headers: browserHeaders(url),
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return parseVrboHtml(html, url, externalId);
  } catch (error) {
    console.error("VRBO scrape error:", error);
    // Try to extract what we can from the URL itself
    return vrboFallback(url, externalId);
  }
}

function browserHeaders(url: string): Record<string, string> {
  return {
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
    Referer: new URL(url).origin + "/",
  };
}

function parseVrboHtml(
  html: string,
  url: string,
  externalId: string | null
): ScrapedListing {
  const result: ScrapedListing = {
    name: "",
    source: "vrbo",
    externalId: externalId || undefined,
    lat: 0,
    lng: 0,
  };

  // 1. Extract from OpenGraph meta tags (most reliable for VRBO)
  const ogTitle = extractMeta(html, "og:title");
  const ogDesc = extractMeta(html, "og:description");
  const ogImage = extractMeta(html, "og:image");
  const ogUrl = extractMeta(html, "og:url");

  if (ogTitle) {
    result.name = ogTitle
      .replace(/\s*\|.*$/, "") // Remove "| VRBO" suffix
      .replace(/\s*-\s*VRBO.*$/i, "")
      .replace(/\s*-\s*Vrbo.*$/i, "")
      .trim();
  }

  result.description = ogDesc || undefined;

  if (ogImage) {
    result.photos = [{ url: ogImage, category: "exterior" }];
  }

  // 2. Try page title if no OG title
  if (!result.name) {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
    if (titleMatch) {
      result.name = titleMatch[1]
        .replace(/\s*\|.*$/, "")
        .replace(/\s*-\s*VRBO.*$/i, "")
        .replace(/\s*-\s*Vrbo.*$/i, "")
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  // 3. Extract from JSON-LD structured data
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

  // 4. Try to find embedded data in script tags (VRBO/Expedia patterns)
  const scriptMatches = html.matchAll(
    /<script[^>]*>([\s\S]*?)<\/script>/g
  );

  for (const match of scriptMatches) {
    const script = match[1];
    if (script.length < 100 || script.length > 5_000_000) continue;

    // Look for window.__NEXT_DATA__ or similar
    if (script.includes("__NEXT_DATA__") || script.includes("__REDUX_STATE__")) {
      try {
        const jsonStr = script.match(/(?:__NEXT_DATA__|__REDUX_STATE__)\s*=\s*({[\s\S]+})/);
        if (jsonStr) {
          const data = JSON.parse(jsonStr[1]);
          extractFromEmbeddedJson(data, result);
        }
      } catch {
        /* parse failed */
      }
    }

    // Look for property data patterns
    if (script.includes('"propertyName"') || script.includes('"headline"')) {
      extractFromRawScript(script, result);
    }
  }

  // 5. Extract coordinates from page content
  if (result.lat === 0 || result.lng === 0) {
    const latPatterns = [
      /"lat(?:itude)?":\s*([-\d.]+)/,
      /"y":\s*([-\d.]+).*"x":\s*([-\d.]+)/,
    ];
    for (const pattern of latPatterns) {
      const m = html.match(pattern);
      if (m) {
        const lat = parseFloat(m[1]);
        if (Math.abs(lat) > 0.01 && Math.abs(lat) < 90) {
          result.lat = lat;
          break;
        }
      }
    }

    const lngPatterns = [
      /"(?:lng|longitude)":\s*([-\d.]+)/,
      /"x":\s*([-\d.]+)/,
    ];
    for (const pattern of lngPatterns) {
      const m = html.match(pattern);
      if (m) {
        const lng = parseFloat(m[1]);
        if (Math.abs(lng) > 0.01 && Math.abs(lng) < 180) {
          result.lng = lng;
          break;
        }
      }
    }
  }

  // 6. Extract additional images from page
  if (!result.photos || result.photos.length <= 1) {
    const imgUrls = new Set<string>();
    if (result.photos?.[0]) imgUrls.add(result.photos[0].url);

    // VRBO uses specific image CDN patterns
    const imgPatterns = [
      /https:\/\/images\.trvl-media\.com\/lodging\/[^"'\s]+/g,
      /https:\/\/a0\.muscache\.com\/[^"'\s]+/g,
      /https:\/\/[^"'\s]*\.vrbo\.com\/[^"'\s]*\.(?:jpg|jpeg|png|webp)[^"'\s]*/gi,
    ];

    for (const pattern of imgPatterns) {
      const matches = html.matchAll(pattern);
      for (const m of matches) {
        if (imgUrls.size >= 20) break;
        const imgUrl = m[0].replace(/&amp;/g, "&");
        if (!imgUrl.includes("pixel") && !imgUrl.includes("1x1")) {
          imgUrls.add(imgUrl);
        }
      }
    }

    if (imgUrls.size > 0) {
      result.photos = Array.from(imgUrls).map((u) => ({ url: u }));
    }
  }

  // 7. Extract price patterns from raw HTML
  if (!result.perNight && !result.totalCost) {
    // Look for price patterns like "$XXX per night" or "avg/night"
    const pricePatterns = [
      /\$(\d[\d,]*)\s*(?:per|\/)\s*night/i,
      /(\d[\d,]*)\s*(?:per|\/)\s*night/i,
      /"pricePerNight":\s*{\s*"amount":\s*([\d.]+)/,
      /"amount":\s*([\d.]+).*?"qualifier":\s*"PER_NIGHT"/,
      /"nightly":\s*([\d.]+)/,
    ];

    for (const pattern of pricePatterns) {
      const m = html.match(pattern);
      if (m) {
        const price = parseFloat(m[1].replace(/,/g, ""));
        if (price > 10 && price < 100000) {
          result.perNight = price;
          break;
        }
      }
    }
  }

  // 8. Extract bedrooms/bathrooms from raw HTML
  if (result.bedrooms == null) {
    const bedroomMatch = html.match(/(\d+)\s*bedroom/i);
    if (bedroomMatch) {
      result.bedrooms = parseInt(bedroomMatch[1]);
    }
  }

  if (result.bathrooms == null) {
    const bathroomMatch = html.match(/([\d.]+)\s*bathroom/i);
    if (bathroomMatch) {
      result.bathrooms = parseFloat(bathroomMatch[1]);
    }
  }

  // 9. Extract rating
  if (!result.rating) {
    const ratingMatch = html.match(/"ratingValue":\s*([\d.]+)/);
    if (ratingMatch) {
      result.rating = parseFloat(ratingMatch[1]);
    }
  }

  if (!result.reviewCount) {
    const reviewMatch = html.match(/"reviewCount":\s*(\d+)/);
    if (reviewMatch) {
      result.reviewCount = parseInt(reviewMatch[1]);
    }
  }

  // Final fallback for name
  if (!result.name) {
    result.name = vrboNameFromUrl(url, externalId);
  }

  return result;
}

function extractMeta(html: string, property: string): string | null {
  // Try property attribute
  const propMatch = html.match(
    new RegExp(`<meta[^>]*property="${property}"[^>]*content="([^"]*)"`)
  );
  if (propMatch) return decodeHtmlEntities(propMatch[1]);

  // Try reversed attribute order
  const revMatch = html.match(
    new RegExp(`<meta[^>]*content="([^"]*)"[^>]*property="${property}"`)
  );
  if (revMatch) return decodeHtmlEntities(revMatch[1]);

  // Try name attribute
  const nameMatch = html.match(
    new RegExp(`<meta[^>]*name="${property}"[^>]*content="([^"]*)"`)
  );
  if (nameMatch) return decodeHtmlEntities(nameMatch[1]);

  return null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'");
}

function extractFromJsonLd(
  ld: Record<string, unknown>,
  result: ScrapedListing
): void {
  if (!ld || typeof ld !== "object") return;

  // Handle @graph arrays
  if (ld["@graph"] && Array.isArray(ld["@graph"])) {
    for (const item of ld["@graph"]) {
      if (typeof item === "object") {
        extractFromJsonLd(item as Record<string, unknown>, result);
      }
    }
    return;
  }

  const type = ld["@type"] as string | string[] | undefined;
  const typeStr = Array.isArray(type) ? type.join(",") : type || "";

  const isLodging =
    typeStr.includes("LodgingBusiness") ||
    typeStr.includes("Hotel") ||
    typeStr.includes("VacationRental") ||
    typeStr.includes("House") ||
    typeStr.includes("Apartment") ||
    typeStr.includes("Accommodation");

  if (isLodging) {
    if (ld.name && typeof ld.name === "string" && !result.name) {
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
      if (parts.length > 0) {
        result.address = parts.join(", ");
        if (!result.neighborhood && address.addressLocality) {
          result.neighborhood = String(address.addressLocality);
        }
      }
    }

    if (ld.image) {
      const images = Array.isArray(ld.image) ? ld.image : [ld.image];
      const urls = images
        .filter((img): img is string => typeof img === "string")
        .map((u) => ({ url: u }));
      if (urls.length > 0) {
        result.photos = urls;
      }
    }

    // Offers / pricing
    const offers = ld.offers as Record<string, unknown> | undefined;
    if (offers?.price) {
      result.perNight = Number(offers.price);
    }
  }
}

function extractFromEmbeddedJson(
  data: Record<string, unknown>,
  result: ScrapedListing
): void {
  const str = JSON.stringify(data);

  // Extract property name
  if (!result.name) {
    const nameMatch = str.match(/"(?:propertyName|headline|title)":\s*"([^"]{5,200})"/);
    if (nameMatch) {
      result.name = nameMatch[1];
    }
  }

  // Extract coordinates
  if (result.lat === 0) {
    const latMatch = str.match(/"lat(?:itude)?":\s*([-\d.]+)/);
    const lngMatch = str.match(/"(?:lng|lon|longitude)":\s*([-\d.]+)/);
    if (latMatch && lngMatch) {
      result.lat = parseFloat(latMatch[1]);
      result.lng = parseFloat(lngMatch[1]);
    }
  }

  // Extract price
  if (!result.perNight) {
    const priceMatch = str.match(/"(?:price|amount|nightly)":\s*([\d.]+)/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1]);
      if (price > 10 && price < 100000) {
        result.perNight = price;
      }
    }
  }
}

function extractFromRawScript(script: string, result: ScrapedListing): void {
  if (!result.name) {
    const nameMatch = script.match(/"(?:propertyName|headline)":\s*"([^"]{5,200})"/);
    if (nameMatch) {
      result.name = nameMatch[1];
    }
  }
}

function vrboNameFromUrl(url: string, externalId: string | null): string {
  try {
    const u = new URL(url);
    // VRBO URLs sometimes have descriptive paths like /vacation-rentals/beautiful-beach-house
    const parts = u.pathname.split("/").filter(Boolean);
    for (const part of parts) {
      // Skip numeric-only parts and known path segments
      if (/^\d+$/.test(part)) continue;
      if (["vacation-rentals", "en-us", "vacation-rental", "p"].includes(part.toLowerCase())) continue;
      // Convert kebab-case to title case
      const name = part
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
      if (name.length > 3) {
        return name;
      }
    }
  } catch {
    /* ignore */
  }
  return `VRBO ${externalId || "Listing"}`;
}

function vrboFallback(url: string, externalId: string | null): ScrapedListing {
  return {
    name: vrboNameFromUrl(url, externalId),
    source: "vrbo",
    externalId: externalId || undefined,
    lat: 0,
    lng: 0,
  };
}
