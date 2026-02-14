import { NextRequest, NextResponse } from "next/server";

// Simple in-memory cache for geocoding results (24h TTL)
const cache = new Map<string, { data: { lat: number; lng: number }; ts: number }>();
const TTL = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing ?q= parameter" }, { status: 400 });
  }

  const cacheKey = q.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data);
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Mapbox token not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&types=place,region,country&limit=1`
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
    }

    const data = await res.json();
    const feature = data.features?.[0];

    if (!feature) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    const [lng, lat] = feature.center;
    const result = { lat, lng };
    cache.set(cacheKey, { data: result, ts: Date.now() });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Geocoding request failed" }, { status: 500 });
  }
}
