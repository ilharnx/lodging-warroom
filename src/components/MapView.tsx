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
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  adults: number;
  nights: number;
}

export default function MapView({
  listings,
  center,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  adults,
  nights,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, { marker: mapboxgl.Marker; el: HTMLDivElement }>>(
    new Map()
  );
  const [noToken, setNoToken] = useState(false);
  const prevSelectedId = useRef<string | null>(null);
  const userInteracting = useRef(false);
  const easeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEasing = useRef(false);
  const resizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs to latest callbacks so marker event listeners never go stale
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onHoverRef.current = onHover; }, [onHover]);

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

    // Debounced resize — prevents rapid resize() calls during CSS transitions
    // from interrupting easeTo animations
    const ro = new ResizeObserver(() => {
      if (isEasing.current) return; // never resize while easing
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
        resizeTimer.current = null;
        map.current?.resize();
      }, 80);
    });
    ro.observe(mapContainer.current);

    return () => {
      if (easeTimeout.current) clearTimeout(easeTimeout.current);
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      ro.disconnect();
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

      // Per-person-per-night price for pin labels
      let price = "?";
      if (listing.perNight && adults > 0) {
        price = `$${Math.round(listing.perNight / adults)}`;
      } else if (listing.totalCost && nights > 0 && adults > 0) {
        price = `$${Math.round(listing.totalCost / nights / adults)}`;
      }

      const existing = markers.current.get(listing.id);
      if (existing) {
        existing.el.textContent = price;
        existing.marker.setLngLat([listing.lng, listing.lat]);
      } else {
        const el = document.createElement("div");
        el.className = "price-marker";
        el.textContent = price;

        el.addEventListener("click", () => onSelectRef.current(listing.id));
        el.addEventListener("mouseenter", () => onHoverRef.current(listing.id));
        el.addEventListener("mouseleave", () => onHoverRef.current(null));

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([listing.lng, listing.lat])
          .addTo(map.current!);

        markers.current.set(listing.id, { marker, el });
      }
    });
  }, [listings, noToken, adults, nights]);

  // Track user map interaction to suppress flyTo during drags/zooms
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const onStart = () => { userInteracting.current = true; };
    const onEnd = () => { userInteracting.current = false; };

    m.on("dragstart", onStart);
    m.on("dragend", onEnd);

    return () => {
      m.off("dragstart", onStart);
      m.off("dragend", onEnd);
    };
  }, [noToken]);

  // Update selected/hovered marker classes
  useEffect(() => {
    markers.current.forEach((entry, id) => {
      if (id === selectedId) {
        entry.el.classList.add("active");
      } else {
        entry.el.classList.remove("active");
      }

      if (id === hoveredId && id !== selectedId) {
        entry.el.classList.add("hovered");
      } else {
        entry.el.classList.remove("hovered");
      }
    });
  }, [selectedId, hoveredId]);

  // Ease to selected listing — only when selectedId genuinely changes
  // and user is not actively dragging the map.
  // Uses isEasing ref to suppress ResizeObserver resize() calls that
  // would otherwise interrupt the animation mid-flight.
  useEffect(() => {
    if (
      selectedId &&
      selectedId !== prevSelectedId.current &&
      map.current &&
      !userInteracting.current
    ) {
      if (easeTimeout.current) clearTimeout(easeTimeout.current);

      const listing = listings.find((l) => l.id === selectedId);
      if (listing && listing.lat !== 0) {
        // Wait for layout transitions to settle, then do a single
        // resize + ease sequence with resize suppressed during the ease.
        easeTimeout.current = setTimeout(() => {
          easeTimeout.current = null;
          // Final resize before easing so the map has correct dimensions
          map.current?.resize();

          isEasing.current = true;
          map.current?.easeTo({
            center: [listing.lng, listing.lat],
            duration: 900,
            easing: (t) => t * (2 - t), // ease-out quadratic
          });

          // Release resize lock after the animation finishes
          setTimeout(() => { isEasing.current = false; }, 950);
        }, 350);
      }
    }
    prevSelectedId.current = selectedId;
  }, [selectedId, listings]);

  if (noToken) {
    return (
      <div style={{
        height: "100%", background: "var(--color-bg)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 32,
      }}>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.3 }}>&#127758;</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", marginBottom: 8 }}>
            Map View
          </h3>
          <p style={{ fontSize: 13, color: "var(--color-text-mid)", marginBottom: 16 }}>
            Set <code style={{ color: "var(--color-coral)", background: "var(--color-panel)", padding: "1px 6px", borderRadius: 4 }}>
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
                    border: selectedId === l.id ? "1px solid var(--color-coral)" : "1px solid var(--color-border-dark)",
                    background: selectedId === l.id ? "var(--color-coral-light)" : "#fff",
                    color: selectedId === l.id ? "var(--color-coral)" : "var(--color-text-mid)",
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
