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
  center: [number, number];
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
      style: "mapbox://styles/mapbox/light-v11",
      center,
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    return () => {
      map.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map.current || noToken) return;

    const currentIds = new Set(listings.map((l) => l.id));

    markers.current.forEach((entry, id) => {
      if (!currentIds.has(id)) {
        entry.marker.remove();
        markers.current.delete(id);
      }
    });

    listings.forEach((listing) => {
      if (listing.lat === 0 && listing.lng === 0) return;

      const price = listing.totalCost
        ? `$${(listing.totalCost / 1000).toFixed(1)}k`
        : listing.perNight
          ? `$${Math.round(listing.perNight)}/n`
          : "?";

      const existing = markers.current.get(listing.id);
      if (existing) {
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

  useEffect(() => {
    markers.current.forEach((entry, id) => {
      if (id === selectedId) {
        entry.el.classList.add("active");
      } else {
        entry.el.classList.remove("active");
      }
    });

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
      <div style={{
        height: "100%", background: "#FAF8F5",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 32,
      }}>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.3 }}>&#127758;</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", marginBottom: 8 }}>
            Map View
          </h3>
          <p style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
            Set <code style={{ color: "#E94E3C", background: "#f5f3ef", padding: "1px 6px", borderRadius: 4 }}>
              NEXT_PUBLIC_MAPBOX_TOKEN
            </code> in your <code>.env</code> to enable the map.
          </p>
          {listings.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              {listings.map((l) => (
                <button
                  key={l.id}
                  onClick={() => onSelect(l.id)}
                  style={{
                    width: "100%", textAlign: "left" as const, padding: "8px 12px", borderRadius: 8,
                    fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    border: selectedId === l.id ? "1px solid #E94E3C" : "1px solid #E8E6E3",
                    background: selectedId === l.id ? "rgba(233,78,60,0.06)" : "#fff",
                    color: selectedId === l.id ? "#E94E3C" : "#888",
                  }}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} style={{ height: "100%", width: "100%", borderRadius: 14 }} />;
}
