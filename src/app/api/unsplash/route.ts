import { NextRequest, NextResponse } from "next/server";

// Simple in-memory cache to avoid hitting Unsplash on every page load
const cache = new Map<string, { data: UnsplashResult; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

interface UnsplashResult {
  url: string;
  attribution: string; // "Photo by Name / Unsplash"
  photographerName: string;
  photographerUrl: string;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing ?q= parameter" }, { status: 400 });
  }

  const key = query.toLowerCase().trim();

  // Check cache
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: "Unsplash not configured" }, { status: 503 });
  }

  try {
    const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
      key + " travel landscape"
    )}&per_page=1&orientation=landscape`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Unsplash API error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      return NextResponse.json({ error: "No photos found" }, { status: 404 });
    }

    const photo = data.results[0];
    // Use the regular size (1080px wide) — good for card headers
    const result: UnsplashResult = {
      url: photo.urls.regular,
      attribution: `Photo by ${photo.user.name} / Unsplash`,
      photographerName: photo.user.name,
      photographerUrl: `${photo.user.links.html}?utm_source=stay&utm_medium=referral`,
    };

    cache.set(key, { data: result, ts: Date.now() });

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch (error) {
    console.error("Unsplash fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch photo" }, { status: 500 });
  }
}
