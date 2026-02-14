import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Resolves the current traveler from the cookie token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const token = request.cookies.get(`stay_traveler_${tripId}`)?.value;

    if (!token) {
      return NextResponse.json({ traveler: null });
    }

    const traveler = await prisma.traveler.findUnique({
      where: { token },
      select: { id: true, name: true, color: true, isCreator: true, tripId: true },
    });

    // Verify traveler belongs to this trip
    if (!traveler || traveler.tripId !== tripId) {
      return NextResponse.json({ traveler: null });
    }

    return NextResponse.json({
      traveler: {
        id: traveler.id,
        name: traveler.name,
        color: traveler.color,
        isCreator: traveler.isCreator,
      },
    });
  } catch (error) {
    console.error("Error resolving traveler:", error);
    return NextResponse.json({ traveler: null });
  }
}
