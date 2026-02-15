import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string }>;
}): Promise<Metadata> {
  const { tripId } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      name: true,
      destination: true,
      checkIn: true,
      checkOut: true,
      nights: true,
      _count: { select: { listings: true } },
    },
  });

  if (!trip) {
    return { title: "Trip not found" };
  }

  const dateRange =
    trip.checkIn && trip.checkOut
      ? `${formatDate(trip.checkIn)} – ${formatDate(trip.checkOut)}`
      : null;

  const parts = [trip.destination];
  if (dateRange) parts.push(dateRange);
  const description = `${trip._count.listings} listing${trip._count.listings === 1 ? "" : "s"} compared${dateRange ? ` · ${dateRange}` : ""}`;

  return {
    title: trip.destination,
    description,
    openGraph: {
      title: `${trip.destination} — Stay`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${trip.destination} — Stay`,
      description,
    },
  };
}

export default function TripLayout({ children }: { children: React.ReactNode }) {
  return children;
}
