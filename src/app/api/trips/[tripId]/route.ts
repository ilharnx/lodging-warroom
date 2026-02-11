import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        listings: {
          include: {
            photos: { orderBy: { sortOrder: "asc" } },
            votes: true,
            comments: { orderBy: { createdAt: "desc" } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (error) {
    console.error("Error fetching trip:", error);
    return NextResponse.json({ error: "Failed to fetch trip" }, { status: 500 });
  }
}
