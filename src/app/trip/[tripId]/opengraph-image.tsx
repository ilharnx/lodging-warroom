import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "Stay — Trip details";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function OgImage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      name: true,
      destination: true,
      checkIn: true,
      checkOut: true,
      nights: true,
      _count: { select: { listings: true, travelers: true } },
    },
  });

  if (!trip) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#FAF6F1",
            fontSize: 36,
            color: "#8A7E74",
          }}
        >
          Trip not found
        </div>
      ),
      { ...size }
    );
  }

  const dateLabel =
    trip.checkIn && trip.checkOut
      ? `${formatDate(trip.checkIn)} – ${formatDate(trip.checkOut)}`
      : trip.checkIn
        ? `From ${formatDate(trip.checkIn)}`
        : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #FAF6F1 0%, #F0EBE3 100%)",
          fontFamily: "Georgia, serif",
          padding: 60,
        }}
      >
        {/* Coral accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "#E05A47",
          }}
        />

        {/* Top: destination + dates */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#2C2521",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {trip.destination}
          </span>
          {dateLabel && (
            <span
              style={{
                fontSize: 28,
                color: "#8A7E74",
                marginTop: 12,
                fontFamily: "sans-serif",
              }}
            >
              {dateLabel}
              {trip.nights ? ` · ${trip.nights} nights` : ""}
            </span>
          )}
        </div>

        {/* Bottom: stats + branding */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          {/* Stats */}
          <div style={{ display: "flex", gap: 40 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: "#2C2521",
                }}
              >
                {trip._count.listings}
              </span>
              <span
                style={{
                  fontSize: 18,
                  color: "#8A7E74",
                  fontFamily: "sans-serif",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                }}
              >
                {trip._count.listings === 1 ? "listing" : "listings"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  color: "#2C2521",
                }}
              >
                {trip._count.travelers}
              </span>
              <span
                style={{
                  fontSize: 18,
                  color: "#8A7E74",
                  fontFamily: "sans-serif",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                }}
              >
                {trip._count.travelers === 1 ? "traveler" : "travelers"}
              </span>
            </div>
          </div>

          {/* Branding */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: 11,
                background: "#E05A47",
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>S</span>
            </div>
            <span
              style={{ fontSize: 28, fontWeight: 700, color: "#2C2521" }}
            >
              Stay
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
