"use client";

import { useState } from "react";
import type { FilterState, Platform, KitchenType } from "@/types";

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const SOURCES: { key: Platform; label: string }[] = [
  { key: "airbnb", label: "Airbnb" },
  { key: "vrbo", label: "VRBO" },
  { key: "booking", label: "Booking" },
];

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = countActiveFilters(filters);

  function update(partial: Partial<FilterState>) {
    onChange({ ...filters, ...partial });
  }

  function toggleSource(source: Platform) {
    const sources = filters.sources.includes(source)
      ? filters.sources.filter((s) => s !== source)
      : [...filters.sources, source];
    update({ sources });
  }

  function toggleKitchen(type: KitchenType) {
    const kitchen = filters.kitchen.includes(type)
      ? filters.kitchen.filter((k) => k !== type)
      : [...filters.kitchen, type];
    update({ kitchen });
  }

  function clearAll() {
    onChange({
      sources: [], priceMin: 0, priceMax: Infinity,
      bedroomsMin: 0, bathroomsMin: 0, kitchen: [],
      kidFriendlyOnly: false, beachDistance: "",
      ratingMin: 0, hasPool: false, sortBy: "recent",
    });
  }

  const chip = (active: boolean): React.CSSProperties => ({
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 600,
    transition: "all 0.15s",
    border: active ? "1.5px solid #E94E3C" : "1px solid #ddd",
    background: active ? "rgba(233,78,60,0.06)" : "#fff",
    color: active ? "#E94E3C" : "#888",
    whiteSpace: "nowrap",
  });

  const dropStyle: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 20,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: 600,
    border: "1px solid #ddd",
    background: "#fff",
    color: "#888",
    outline: "none",
    paddingRight: 24,
  };

  return (
    <div style={{ borderBottom: "1px solid #E8E6E3", flexShrink: 0, background: "#fff" }}>
      <div style={{
        padding: "12px 28px",
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
      }}>
        {/* Sort */}
        <select
          value={filters.sortBy}
          onChange={(e) => update({ sortBy: e.target.value as FilterState["sortBy"] })}
          style={{
            ...dropStyle,
            background: "#FAF8F5",
            borderColor: "#E8E6E3",
          }}
        >
          <option value="recent">Sort: Recent</option>
          <option value="votes_desc">Sort: Votes</option>
          <option value="price_asc">Sort: Price</option>
          <option value="rating">Sort: Rating</option>
        </select>

        <span style={{ color: "#eee", margin: "0 2px" }}>|</span>

        {/* Source chips */}
        {SOURCES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => toggleSource(key)}
            style={chip(filters.sources.includes(key))}
          >
            {label}
          </button>
        ))}

        <span style={{ color: "#eee", margin: "0 2px" }}>|</span>

        {/* Quick filters */}
        <button onClick={() => update({ hasPool: !filters.hasPool })} style={chip(filters.hasPool)}>
          Pool
        </button>
        <button onClick={() => update({ kidFriendlyOnly: !filters.kidFriendlyOnly })} style={chip(filters.kidFriendlyOnly)}>
          Kid-friendly
        </button>

        {/* More filters toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            ...chip(activeCount > 0),
            marginLeft: "auto",
          }}
        >
          Filters{activeCount > 0 ? ` (${activeCount})` : ""} {expanded ? "\u25B2" : "\u25BC"}
        </button>

        {activeCount > 0 && (
          <button
            onClick={clearAll}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 12, color: "#E94E3C", fontWeight: 600, fontFamily: "inherit",
              padding: "6px 8px",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div style={{
          padding: "12px 28px 16px",
          borderTop: "1px solid #f0ede8",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#999", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1.2 }}>
              Min Bedrooms
            </label>
            <select
              value={filters.bedroomsMin}
              onChange={(e) => update({ bedroomsMin: Number(e.target.value) })}
              style={{ ...dropStyle, width: "100%", borderRadius: 8 }}
            >
              <option value="0">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#999", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1.2 }}>
              Min Bathrooms
            </label>
            <select
              value={filters.bathroomsMin}
              onChange={(e) => update({ bathroomsMin: Number(e.target.value) })}
              style={{ ...dropStyle, width: "100%", borderRadius: 8 }}
            >
              <option value="0">Any</option>
              <option value="1">1+</option>
              <option value="1.5">1.5+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#999", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1.2 }}>
              Kitchen
            </label>
            <div style={{ display: "flex", gap: 4 }}>
              {(["full", "kitchenette"] as KitchenType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => toggleKitchen(type)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 11, cursor: "pointer",
                    fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s",
                    border: filters.kitchen.includes(type) ? "1.5px solid #E94E3C" : "1px solid #ddd",
                    background: filters.kitchen.includes(type) ? "rgba(233,78,60,0.06)" : "#fff",
                    color: filters.kitchen.includes(type) ? "#E94E3C" : "#999",
                  }}
                >
                  {type === "full" ? "Full" : "Kitchenette"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: "#999", marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1.2 }}>
              Min Rating
            </label>
            <select
              value={filters.ratingMin}
              onChange={(e) => update({ ratingMin: Number(e.target.value) })}
              style={{ ...dropStyle, width: "100%", borderRadius: 8 }}
            >
              <option value="0">Any</option>
              <option value="4">4+</option>
              <option value="4.5">4.5+</option>
              <option value="4.8">4.8+</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function countActiveFilters(filters: FilterState): number {
  let count = 0;
  if (filters.bedroomsMin > 0) count++;
  if (filters.bathroomsMin > 0) count++;
  if (filters.kitchen.length > 0) count++;
  if (filters.ratingMin > 0) count++;
  if (filters.priceMax < Infinity) count++;
  return count;
}
