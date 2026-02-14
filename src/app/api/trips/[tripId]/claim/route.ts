import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const body = await request.json();
    const { travelerId } = body;

    if (!travelerId) {
      return NextResponse.json(
        { error: "travelerId is required" },
        { status: 400 }
      );
    }

    const traveler = await prisma.traveler.findFirst({
      where: { id: travelerId, tripId },
    });

    if (!traveler) {
      return NextResponse.json({ error: "Traveler not found" }, { status: 404 });
    }

    // Set the cookie and return the traveler
    const response = NextResponse.json(traveler);
    response.cookies.set(`stay_traveler_${tripId}`, traveler.token, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 31536000, // 1 year
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error claiming traveler:", error);
    return NextResponse.json({ error: "Failed to claim traveler" }, { status: 500 });
  }
}
