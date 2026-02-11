"use client";

import { useState, useEffect } from "react";

interface Trip {
  id: string;
  name: string;
  destination: string;
  adults: number;
  kids: number;
  createdAt: string;
  listings: { id: string; name: string; scrapeStatus: string }[];
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

  // Popular destinations for quick setup
  const presets = [
    { name: "Barbados", lat: 13.1939, lng: -59.5432 },
    { name: "Cancun", lat: 21.1619, lng: -86.8515 },
    { name: "Maui", lat: 20.7984, lng: -156.3319 },
    { name: "Lisbon", lat: 38.7223, lng: -9.1393 },
    { name: "Bali", lat: -8.3405, lng: 115.092 },
    { name: "Tulum", lat: 20.2114, lng: -87.4654 },
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="border-b border-[#E8E6E3] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#E94E3C]">
            Lodging War Room
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-[#E94E3C] text-white font-semibold rounded-lg hover:bg-[#d4443a] transition"
          >
            + New Trip
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="text-center py-20 text-[#999]">
            Loading...
          </div>
        ) : trips.length === 0 && !showCreate ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">
              Plan your next group trip
            </h2>
            <p className="text-[#999] mb-8 max-w-md mx-auto">
              Compare vacation rentals from Airbnb, VRBO, Booking.com and more
              — all in one place, on one map.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-[#E94E3C] text-white font-semibold rounded-lg hover:bg-[#d4443a] transition text-lg"
            >
              Create Your First Trip
            </button>
          </div>
        ) : (
          <>
            {!showCreate && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {trips.map((trip) => (
                  <a
                    key={trip.id}
                    href={`/trip/${trip.id}`}
                    className="block p-5 bg-white border border-[#E8E6E3] rounded-xl hover:border-[#E94E3C] transition"
                  >
                    <h3 className="font-bold text-[#1a1a1a] text-lg">
                      {trip.name}
                    </h3>
                    <p className="text-sm text-[#999] mt-1">
                      {trip.destination}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-[#999]">
                      <span>{trip.adults} adults</span>
                      {trip.kids > 0 && <span>{trip.kids} kids</span>}
                      <span>{trip.listings.length} listings</span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        {showCreate && (
          <div className="max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-[#1a1a1a] mb-6">
              Create a Trip
            </h2>
            <form onSubmit={createTrip} className="space-y-4">
              <div>
                <label className="block text-sm text-[#999] mb-1">
                  Trip Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Barbados 2026"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-white border border-[#E8E6E3] rounded-lg text-[#1a1a1a] placeholder:text-[#bbb] focus:outline-none focus:border-[#E94E3C]"
                />
              </div>

              <div>
                <label className="block text-sm text-[#999] mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  required
                  placeholder="Barbados"
                  value={form.destination}
                  onChange={(e) =>
                    setForm({ ...form, destination: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-white border border-[#E8E6E3] rounded-lg text-[#1a1a1a] placeholder:text-[#bbb] focus:outline-none focus:border-[#E94E3C]"
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
                      className="px-3 py-1 text-xs bg-[#f5f3ef] border border-[#E8E6E3] rounded-full text-[#999] hover:border-[#E94E3C] hover:text-[#E94E3C] transition"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#999] mb-1">
                    Center Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="13.1939"
                    value={form.centerLat}
                    onChange={(e) =>
                      setForm({ ...form, centerLat: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-white border border-[#E8E6E3] rounded-lg text-[#1a1a1a] placeholder:text-[#bbb] focus:outline-none focus:border-[#E94E3C]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#999] mb-1">
                    Center Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="-59.5432"
                    value={form.centerLng}
                    onChange={(e) =>
                      setForm({ ...form, centerLng: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-white border border-[#E8E6E3] rounded-lg text-[#1a1a1a] placeholder:text-[#bbb] focus:outline-none focus:border-[#E94E3C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#999] mb-1">
                    Adults
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.adults}
                    onChange={(e) =>
                      setForm({ ...form, adults: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-white border border-[#E8E6E3] rounded-lg text-[#1a1a1a] focus:outline-none focus:border-[#E94E3C]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#999] mb-1">
                    Kids
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.kids}
                    onChange={(e) =>
                      setForm({ ...form, kids: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-white border border-[#E8E6E3] rounded-lg text-[#1a1a1a] focus:outline-none focus:border-[#E94E3C]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-[#E94E3C] text-white font-semibold rounded-lg hover:bg-[#d4443a] transition"
                >
                  Create Trip
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2.5 bg-[#f5f3ef] border border-[#E8E6E3] text-[#999] rounded-lg hover:border-[#bbb] transition"
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
