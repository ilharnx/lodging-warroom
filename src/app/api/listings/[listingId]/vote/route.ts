import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const body = await request.json();
    const { userName, value } = body;

    if (!userName || (value !== 1 && value !== -1)) {
      return NextResponse.json(
        { error: "userName and value (1 or -1) are required" },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Upsert: update existing vote or create new
    const vote = await prisma.vote.upsert({
      where: { listingId_userName: { listingId, userName } },
      update: { value },
      create: { listingId, userName, value },
    });

    // Return updated vote tally
    const votes = await prisma.vote.findMany({ where: { listingId } });
    const tally = votes.reduce((sum, v) => sum + v.value, 0);

    return NextResponse.json({ vote, tally, votes });
  } catch (error) {
    console.error("Error voting:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}
