"use client";

import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Listing {
  id: string;
  lat: number;
  lng: number;
  name: string;
  totalCost: number | null;
  perNight: number | null;
  source: string;
  scrapeStatus: string;
}

interface MapViewProps {
  listings: Listing[];
  center: [number, number]; // [lng, lat]
  selectedId: string | null;
  onSelect: (id: string) => void;
  adults: number;
}

export default function MapView({
  listings,
  center,
  selectedId,
  onSelect,
  adults,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, { marker: mapboxgl.Marker; el: HTMLDivElement }>>(
    new Map()
  );
  const [noToken, setNoToken] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      setNoToken(true);
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(
      new mapboxgl.GeolocateControl({ trackUserLocation: false }),
      "top-right"
    );

    return () => {
      map.current?.remove();
    };
    // Only init once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when listings change
  useEffect(() => {
    if (!map.current || noToken) return;

    const currentIds = new Set(listings.map((l) => l.id));

    // Remove markers no longer in list
    markers.current.forEach((entry, id) => {
      if (!currentIds.has(id)) {
        entry.marker.remove();
        markers.current.delete(id);
      }
    });

    // Add or update markers
    listings.forEach((listing) => {
      if (listing.lat === 0 && listing.lng === 0) return;

      const price = listing.totalCost
        ? `$${Math.round(listing.totalCost / adults)}/pp`
        : listing.perNight
          ? `$${Math.round(listing.perNight)}/n`
          : "?";

      const existing = markers.current.get(listing.id);
      if (existing) {
        // Update price text
        existing.el.textContent = price;
        existing.marker.setLngLat([listing.lng, listing.lat]);
      } else {
        const el = document.createElement("div");
        el.className = "price-marker";
        el.textContent = price;
        el.addEventListener("click", () => onSelect(listing.id));

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([listing.lng, listing.lat])
          .addTo(map.current!);

        markers.current.set(listing.id, { marker, el });
      }
    });
  }, [listings, noToken, onSelect, adults]);

  // Highlight selected marker
  useEffect(() => {
    markers.current.forEach((entry, id) => {
      if (id === selectedId) {
        entry.el.classList.add("active");
      } else {
        entry.el.classList.remove("active");
      }
    });

    // Pan to selected
    if (selectedId && map.current) {
      const listing = listings.find((l) => l.id === selectedId);
      if (listing && listing.lat !== 0) {
        map.current.flyTo({
          center: [listing.lng, listing.lat],
          duration: 800,
        });
      }
    }
  }, [selectedId, listings]);

  if (noToken) {
    return (
      <div className="h-full bg-[var(--navy-800)] flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">&#127758;</div>
          <h3 className="text-lg font-bold text-white mb-2">Map View</h3>
          <p className="text-sm text-[var(--navy-500)] mb-4">
            Set <code className="text-[var(--gold-400)]">NEXT_PUBLIC_MAPBOX_TOKEN</code> in
            your <code>.env</code> file to enable the interactive map.
          </p>
          <p className="text-xs text-[var(--navy-500)]">
            Get a free token at{" "}
            <span className="text-[var(--gold-400)]">mapbox.com</span>
          </p>
          {/* Fallback: show listing coordinates */}
          {listings.length > 0 && (
            <div className="mt-6 space-y-2">
              {listings.map((l) => (
                <button
                  key={l.id}
                  onClick={() => onSelect(l.id)}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${
                    selectedId === l.id
                      ? "bg-[var(--gold-500)] text-[var(--navy-900)]"
                      : "bg-[var(--navy-700)] text-[var(--navy-500)]"
                  }`}
                >
                  {l.name} ({l.lat.toFixed(4)}, {l.lng.toFixed(4)})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="h-full w-full" />;
}
