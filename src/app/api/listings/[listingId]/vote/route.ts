import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ReactionType as ReactionTypeEnum } from "@prisma/client";

const VALID_REACTIONS = new Set<string>(["fire", "love", "think", "pass"]);
const REACTION_VALUE: Record<string, number> = {
  fire: 1,
  love: 1,
  think: 0,
  pass: -1,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const body = await request.json();
    const { userName, reactionType } = body;

    if (!userName || !VALID_REACTIONS.has(reactionType)) {
      return NextResponse.json(
        { error: "userName and reactionType (fire|love|think|pass) are required" },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, tripId: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const value = REACTION_VALUE[reactionType] ?? 0;

    // Try to resolve travelerId from cookie
    let travelerId: string | null = null;
    const cookieToken = request.cookies.get(`stay_traveler_${listing.tripId}`)?.value;
    if (cookieToken) {
      const traveler = await prisma.traveler.findUnique({
        where: { token: cookieToken },
        select: { id: true },
      });
      if (traveler) travelerId = traveler.id;
    }

    // Upsert: update existing vote or create new
    const vote = await prisma.vote.upsert({
      where: { listingId_userName: { listingId, userName } },
      update: { reactionType: reactionType as ReactionTypeEnum, value, travelerId },
      create: { listingId, userName, reactionType: reactionType as ReactionTypeEnum, value, travelerId },
    });

    // Return updated votes
    const votes = await prisma.vote.findMany({ where: { listingId } });

    return NextResponse.json({ vote, votes });
  } catch (error) {
    console.error("Error voting:", error);
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const { listingId } = await params;
    const { searchParams } = new URL(request.url);
    const userName = searchParams.get("userName");

    if (!userName) {
      return NextResponse.json(
        { error: "userName is required" },
        { status: 400 }
      );
    }

    await prisma.vote.deleteMany({
      where: { listingId, userName },
    });

    const votes = await prisma.vote.findMany({ where: { listingId } });

    return NextResponse.json({ votes });
  } catch (error) {
    console.error("Error removing vote:", error);
    return NextResponse.json({ error: "Failed to remove vote" }, { status: 500 });
  }
}
