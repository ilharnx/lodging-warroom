"use client";

import { useState, useEffect } from "react";

interface TripListing {
  id: string;
  name: string;
  scrapeStatus: string;
  perNight: number | null;
  totalCost: number | null;
}

interface Trip {
  id: string;
  name: string;
  destination: string;
  adults: number;
  kids: number;
  createdAt: string;
  listings: TripListing[];
}

const DESTINATION_FLAGS: Record<string, string> = {
  barbados: "\u{1F1E7}\u{1F1E7}",
  mexico: "\u{1F1F2}\u{1F1FD}",
  cancun: "\u{1F1F2}\u{1F1FD}",
  tulum: "\u{1F1F2}\u{1F1FD}",
  hawaii: "\u{1F1FA}\u{1F1F8}",
  maui: "\u{1F1FA}\u{1F1F8}",
  portugal: "\u{1F1F5}\u{1F1F9}",
  lisbon: "\u{1F1F5}\u{1F1F9}",
  bali: "\u{1F1EE}\u{1F1E9}",
  indonesia: "\u{1F1EE}\u{1F1E9}",
  spain: "\u{1F1EA}\u{1F1F8}",
  france: "\u{1F1EB}\u{1F1F7}",
  italy: "\u{1F1EE}\u{1F1F9}",
  greece: "\u{1F1EC}\u{1F1F7}",
  japan: "\u{1F1EF}\u{1F1F5}",
  thailand: "\u{1F1F9}\u{1F1ED}",
  "costa rica": "\u{1F1E8}\u{1F1F7}",
  colombia: "\u{1F1E8}\u{1F1F4}",
  "dominican republic": "\u{1F1E9}\u{1F1F4}",
  jamaica: "\u{1F1EF}\u{1F1F2}",
  "puerto rico": "\u{1F1F5}\u{1F1F7}",
  aruba: "\u{1F1E6}\u{1F1FC}",
};

function getFlag(destination: string): string {
  const lower = destination.toLowerCase();
  for (const [key, flag] of Object.entries(DESTINATION_FLAGS)) {
    if (lower.includes(key)) return flag;
  }
  return "\u{1F30D}";
}

function formatAvgPrice(listings: TripListing[]): string | null {
  const prices = listings
    .map((l) => l.perNight || l.totalCost)
    .filter((p): p is number => p != null && p > 0);
  if (prices.length === 0) return null;
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  return `$${Math.round(avg)}`;
}

export default function Home() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    destination: "",
    centerLat: "",
    centerLng: "",
    adults: "4",
    kids: "2",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trips")
      .then((r) => r.json())
      .then((data) => {
        setTrips(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function createTrip(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        destination: form.destination,
        centerLat: parseFloat(form.centerLat) || 13.1939,
        centerLng: parseFloat(form.centerLng) || -59.5432,
        adults: parseInt(form.adults) || 4,
        kids: parseInt(form.kids) || 2,
      }),
    });
    if (res.ok) {
      const trip = await res.json();
      window.location.href = `/trip/${trip.id}`;
    }
  }

  const presets = [
    { name: "Barbados", lat: 13.1939, lng: -59.5432 },
    { name: "Cancun", lat: 21.1619, lng: -86.8515 },
    { name: "Maui", lat: 20.7984, lng: -156.3319 },
    { name: "Lisbon", lat: 38.7223, lng: -9.1393 },
    { name: "Bali", lat: -8.3405, lng: 115.092 },
    { name: "Tulum", lat: 20.2114, lng: -87.4654 },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <header style={{ borderBottom: "1px solid var(--color-border-dark)", padding: "16px 24px" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-coral)", fontFamily: "var(--font-heading)" }}>
            Stay
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: "8px 16px",
              background: "var(--color-coral)",
              color: "#fff",
              fontWeight: 600,
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 14,
              transition: "background 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "var(--color-coral-hover)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "var(--color-coral)")}
          >
            + New Trip
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20" style={{ color: "var(--color-text-mid)" }}>
            Loading...
          </div>
        ) : trips.length === 0 && !showCreate ? (
          <div className="text-center py-20">
            <h2 style={{ fontSize: 24, fontWeight: 600, color: "var(--color-text)", marginBottom: 8, fontFamily: "var(--font-heading)" }}>
              Plan your next group trip
            </h2>
            <p style={{ color: "var(--color-text-mid)", marginBottom: 32, maxWidth: 420, marginInline: "auto" }}>
              Compare vacation rentals from Airbnb, VRBO, Booking.com and more
              — all in one place, on one map.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: "12px 24px",
                background: "var(--color-coral)",
                color: "#fff",
                fontWeight: 600,
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 16,
              }}
            >
              Create Your First Trip
            </button>
          </div>
        ) : (
          <>
            {!showCreate && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {trips.map((trip) => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>

                {/* Empty state — prompt for another trip */}
                <div
                  style={{
                    marginTop: 16,
                    padding: "20px 24px",
                    border: "2px dashed var(--color-border-dark)",
                    borderRadius: 14,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowCreate(true)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowCreate(true); } }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-coral)";
                    e.currentTarget.style.background = "var(--color-coral-light)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border-dark)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <p style={{ color: "var(--color-text-mid)", fontSize: 14 }}>
                    Planning another escape?
                  </p>
                  <p style={{ color: "var(--color-coral)", fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                    + Create a new trip
                  </p>
                </div>
              </>
            )}
          </>
        )}

        {showCreate && (
          <div className="max-w-lg mx-auto animate-slide-up">
            <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--color-text)", marginBottom: 24, fontFamily: "var(--font-heading)" }}>
              Create a Trip
            </h2>
            <form onSubmit={createTrip} className="space-y-4">
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--color-text-mid)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Trip Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Barbados 2026"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    background: "#fff",
                    border: "1px solid var(--color-border-dark)",
                    borderRadius: 8,
                    color: "var(--color-text)",
                    fontFamily: "inherit",
                    fontSize: 14,
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--color-text-mid)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  Destination
                </label>
                <input
                  type="text"
                  required
                  placeholder="Barbados"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    background: "#fff",
                    border: "1px solid var(--color-border-dark)",
                    borderRadius: 8,
                    color: "var(--color-text)",
                    fontFamily: "inherit",
                    fontSize: 14,
                  }}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {presets.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          destination: p.name,
                          name: form.name || `${p.name} ${new Date().getFullYear()}`,
                          centerLat: String(p.lat),
                          centerLng: String(p.lng),
                        })
                      }
                      style={{
                        padding: "4px 12px",
                        fontSize: 12,
                        background: "var(--color-panel)",
                        border: "1px solid var(--color-border-dark)",
                        borderRadius: 20,
                        color: "var(--color-text-mid)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--color-text-mid)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Center Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="13.1939"
                    value={form.centerLat}
                    onChange={(e) => setForm({ ...form, centerLat: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "#fff",
                      border: "1px solid var(--color-border-dark)",
                      borderRadius: 8,
                      color: "var(--color-text)",
                      fontFamily: "inherit",
                      fontSize: 14,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--color-text-mid)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Center Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-59.5432"
                    value={form.centerLng}
                    onChange={(e) => setForm({ ...form, centerLng: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "#fff",
                      border: "1px solid var(--color-border-dark)",
                      borderRadius: 8,
                      color: "var(--color-text)",
                      fontFamily: "inherit",
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--color-text-mid)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Adults
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.adults}
                    onChange={(e) => setForm({ ...form, adults: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "#fff",
                      border: "1px solid var(--color-border-dark)",
                      borderRadius: 8,
                      color: "var(--color-text)",
                      fontFamily: "inherit",
                      fontSize: 14,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--color-text-mid)", marginBottom: 4, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.8 }}>
                    Kids
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.kids}
                    onChange={(e) => setForm({ ...form, kids: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      background: "#fff",
                      border: "1px solid var(--color-border-dark)",
                      borderRadius: 8,
                      color: "var(--color-text)",
                      fontFamily: "inherit",
                      fontSize: 14,
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    background: "var(--color-coral)",
                    color: "#fff",
                    fontWeight: 600,
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 14,
                  }}
                >
                  Create Trip
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  style={{
                    padding: "10px 16px",
                    background: "var(--color-panel)",
                    border: "1px solid var(--color-border-dark)",
                    color: "var(--color-text-mid)",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 14,
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Trip Card ────────────────────────────────────────────── */

function TripCard({ trip }: { trip: Trip }) {
  const [hovered, setHovered] = useState(false);
  const totalTravelers = trip.adults + trip.kids;
  const avgPrice = formatAvgPrice(trip.listings);
  const flag = getFlag(trip.destination);

  return (
    <a
      href={`/trip/${trip.id}`}
      style={{
        display: "block",
        background: "#fff",
        border: "1px solid var(--color-border-dark)",
        borderRadius: 14,
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        transition: "all 0.2s var(--ease-spring)",
        transform: hovered ? "translateY(-2px)" : "none",
        boxShadow: hovered
          ? "0 8px 24px rgba(0,0,0,0.08)"
          : "0 1px 4px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Warm gradient header with flag */}
      <div
        style={{
          padding: "16px 20px 12px",
          background: "linear-gradient(135deg, #F9EDE8 0%, #F5EBE4 50%, #EDE7E0 100%)",
          borderBottom: "1px solid var(--color-border)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 22 }}>{flag}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--color-text)", margin: 0, lineHeight: 1.3, fontFamily: "var(--font-heading)" }}>
              {trip.name}
            </h3>
            <p style={{ fontSize: 13, color: "var(--color-text-mid)", margin: 0, marginTop: 2 }}>
              {trip.destination}
            </p>
          </div>
        </div>
        {/* Coral accent bar on hover */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "var(--color-coral)",
            transform: hovered ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left",
            transition: "transform 0.25s var(--ease-spring)",
          }}
        />
      </div>

      {/* Stats */}
      <div style={{ padding: "14px 20px 16px" }}>
        <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--color-text-mid)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 14 }}>&#128101;</span>
            {totalTravelers} travelers
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 14 }}>&#127968;</span>
            {trip.listings.length} listing{trip.listings.length !== 1 ? "s" : ""}
          </span>
          {avgPrice && (
            <span className="font-mono" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              ~{avgPrice}/night
            </span>
          )}
        </div>

        {/* Hover CTA */}
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--color-coral)",
            opacity: hovered ? 1 : 0,
            transform: hovered ? "translateX(0)" : "translateX(-4px)",
            transition: "all 0.2s var(--ease-spring)",
          }}
        >
          Open trip &rarr;
        </div>
      </div>
    </a>
  );
}
