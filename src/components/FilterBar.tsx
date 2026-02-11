"use client";

import { useState } from "react";
import type { FilterState, Platform, KitchenType } from "@/types";

interface FilterBarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

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
      sources: [],
      priceMin: 0,
      priceMax: Infinity,
      bedroomsMin: 0,
      bathroomsMin: 0,
      kitchen: [],
      kidFriendlyOnly: false,
      beachDistance: "",
      ratingMin: 0,
      hasPool: false,
      sortBy: "recent",
    });
  }

  return (
    <div className="border-b border-[var(--navy-600)] shrink-0">
      <div className="px-4 py-2 flex items-center gap-3 overflow-x-auto">
        {/* Sort */}
        <select
          value={filters.sortBy}
          onChange={(e) =>
            update({ sortBy: e.target.value as FilterState["sortBy"] })
          }
          className="px-3 py-1.5 text-xs bg-[var(--navy-700)] border border-[var(--navy-600)] text-[var(--navy-500)] rounded-lg focus:outline-none focus:border-[var(--gold-500)]"
        >
          <option value="recent">Recent</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="votes_desc">Most Votes</option>
          <option value="rating">Highest Rating</option>
        </select>

        {/* Source chips */}
        {(["airbnb", "vrbo", "booking"] as Platform[]).map((source) => (
          <button
            key={source}
            onClick={() => toggleSource(source)}
            className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition ${
              filters.sources.includes(source)
                ? "bg-[var(--gold-500)] text-[var(--navy-900)] font-semibold"
                : "bg-[var(--navy-700)] text-[var(--navy-500)] border border-[var(--navy-600)] hover:border-[var(--navy-500)]"
            }`}
          >
            {source === "airbnb"
              ? "Airbnb"
              : source === "vrbo"
                ? "VRBO"
                : "Booking"}
          </button>
        ))}

        {/* Toggle more filters */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition ${
            activeCount > 0
              ? "bg-[var(--gold-500)]/20 text-[var(--gold-400)] border border-[var(--gold-500)]"
              : "bg-[var(--navy-700)] text-[var(--navy-500)] border border-[var(--navy-600)] hover:border-[var(--navy-500)]"
          }`}
        >
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}{" "}
          {expanded ? "&#9650;" : "&#9660;"}
        </button>

        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 whitespace-nowrap"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="px-4 py-3 border-t border-[var(--navy-700)] grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Bedrooms */}
          <div>
            <label className="block text-[10px] text-[var(--navy-500)] mb-1 uppercase tracking-wider">
              Min Bedrooms
            </label>
            <select
              value={filters.bedroomsMin}
              onChange={(e) =>
                update({ bedroomsMin: Number(e.target.value) })
              }
              className="w-full px-3 py-1.5 text-xs bg-[var(--navy-700)] border border-[var(--navy-600)] text-white rounded-lg focus:outline-none focus:border-[var(--gold-500)]"
            >
              <option value="0">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>

          {/* Bathrooms */}
          <div>
            <label className="block text-[10px] text-[var(--navy-500)] mb-1 uppercase tracking-wider">
              Min Bathrooms
            </label>
            <select
              value={filters.bathroomsMin}
              onChange={(e) =>
                update({ bathroomsMin: Number(e.target.value) })
              }
              className="w-full px-3 py-1.5 text-xs bg-[var(--navy-700)] border border-[var(--navy-600)] text-white rounded-lg focus:outline-none focus:border-[var(--gold-500)]"
            >
              <option value="0">Any</option>
              <option value="1">1+</option>
              <option value="1.5">1.5+</option>
              <option value="2">2+</option>
              <option value="2.5">2.5+</option>
            </select>
          </div>

          {/* Kitchen */}
          <div>
            <label className="block text-[10px] text-[var(--navy-500)] mb-1 uppercase tracking-wider">
              Kitchen
            </label>
            <div className="flex flex-wrap gap-1">
              {(["full", "kitchenette"] as KitchenType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => toggleKitchen(type)}
                  className={`px-2 py-1 text-[10px] rounded transition ${
                    filters.kitchen.includes(type)
                      ? "bg-[var(--gold-500)] text-[var(--navy-900)] font-semibold"
                      : "bg-[var(--navy-800)] text-[var(--navy-500)] border border-[var(--navy-600)]"
                  }`}
                >
                  {type === "full" ? "Full" : "Kitchenette"}
                </button>
              ))}
            </div>
          </div>

          {/* Min Rating */}
          <div>
            <label className="block text-[10px] text-[var(--navy-500)] mb-1 uppercase tracking-wider">
              Min Rating
            </label>
            <select
              value={filters.ratingMin}
              onChange={(e) =>
                update({ ratingMin: Number(e.target.value) })
              }
              className="w-full px-3 py-1.5 text-xs bg-[var(--navy-700)] border border-[var(--navy-600)] text-white rounded-lg focus:outline-none focus:border-[var(--gold-500)]"
            >
              <option value="0">Any</option>
              <option value="4">4+</option>
              <option value="4.5">4.5+</option>
              <option value="4.8">4.8+</option>
            </select>
          </div>

          {/* Toggles row */}
          <div className="col-span-2 sm:col-span-4 flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.kidFriendlyOnly}
                onChange={(e) =>
                  update({ kidFriendlyOnly: e.target.checked })
                }
                className="accent-[var(--gold-500)]"
              />
              <span className="text-xs text-[var(--navy-500)]">
                Kid-friendly only
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasPool}
                onChange={(e) => update({ hasPool: e.target.checked })}
                className="accent-[var(--gold-500)]"
              />
              <span className="text-xs text-[var(--navy-500)]">Has pool</span>
            </label>
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
  if (filters.kidFriendlyOnly) count++;
  if (filters.hasPool) count++;
  if (filters.ratingMin > 0) count++;
  if (filters.priceMax < Infinity) count++;
  return count;
}
