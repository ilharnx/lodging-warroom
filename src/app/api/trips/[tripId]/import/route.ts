import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { detectPlatform } from "@/lib/scraper/detect";
import { scrapeUrl } from "@/lib/scraper";
import { parse } from "csv-parse/sync";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";
    let rows: Array<Record<string, string>> = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }
      const text = await file.text();
      rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });
    } else {
      const body = await request.json();
      if (body.csv) {
        rows = parse(body.csv, { columns: true, skip_empty_lines: true, trim: true });
      } else if (body.urls && Array.isArray(body.urls)) {
        rows = body.urls.map((url: string) => ({ url }));
      } else {
        return NextResponse.json(
          { error: "Provide a CSV file, csv string, or urls array" },
          { status: 400 }
        );
      }
    }

    const results: Array<{ url: string; status: string; listingId?: string; error?: string }> = [];

    for (const row of rows) {
      const url = row.url || row.URL || row.link || row.Link;
      if (!url || !url.startsWith("http")) {
        results.push({ url: url || "(empty)", status: "skipped", error: "Invalid URL" });
        continue;
      }

      const platform = detectPlatform(url);
      try {
        const listing = await prisma.listing.create({
          data: {
            tripId,
            url,
            source: platform,
            name: row.name || "Loading...",
            lat: trip.centerLat,
            lng: trip.centerLng,
            scrapeStatus: "pending",
            addedBy: row.addedBy || row.added_by || null,
          },
        });

        // Use after() to keep serverless function alive for scrape
        after(async () => {
          try {
            await scrapeUrl(listing.id, url, platform);
          } catch (err) {
            console.error(`Scrape failed for ${listing.id}:`, err);
          }
        });

        results.push({ url, status: "queued", listingId: listing.id });
      } catch (err) {
        results.push({ url, status: "error", error: String(err) });
      }
    }

    return NextResponse.json({
      total: rows.length,
      queued: results.filter((r) => r.status === "queued").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      results,
    });
  } catch (error) {
    console.error("Error importing listings:", error);
    return NextResponse.json({ error: "Failed to import listings" }, { status: 500 });
  }
}
