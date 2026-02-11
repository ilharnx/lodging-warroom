import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    // jobId is the listing ID — we poll listing status
    const listing = await prisma.listing.findUnique({
      where: { id: jobId },
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        votes: true,
        comments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: listing.scrapeStatus,
      error: listing.scrapeError,
      listing: listing.scrapeStatus === "done" ? listing : undefined,
    });
  } catch (error) {
    console.error("Error checking scrape status:", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
