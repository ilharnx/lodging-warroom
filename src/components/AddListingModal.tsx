"use client";

import { useState } from "react";

interface AddListingModalProps {
  tripId: string;
  onClose: () => void;
  onAdded: () => void;
  addedBy: string;
}

export function AddListingModal({
  tripId,
  onClose,
  onAdded,
  addedBy,
}: AddListingModalProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");
    setStatus("Adding listing...");

    try {
      const res = await fetch(`/api/trips/${tripId}/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), addedBy }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add listing");
      }

      setStatus("Scraping started! The listing will update automatically.");
      // Short delay so user sees the success message
      setTimeout(onAdded, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--navy-800)] border border-[var(--navy-600)] rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Add Listing</h2>
          <button
            onClick={onClose}
            className="text-[var(--navy-500)] hover:text-white transition"
          >
            &#10005;
          </button>
        </div>

        <p className="text-sm text-[var(--navy-500)] mb-4">
          Paste a listing URL from Airbnb, VRBO, Booking.com, or any vacation
          rental site.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="url"
            required
            placeholder="https://www.airbnb.com/rooms/12345678"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            autoFocus
            className="w-full px-4 py-3 bg-[var(--navy-900)] border border-[var(--navy-600)] rounded-lg text-white placeholder:text-[var(--navy-500)] focus:outline-none focus:border-[var(--gold-500)] text-sm"
          />

          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}

          {status && !error && (
            <p className="mt-2 text-sm text-green-400">{status}</p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[var(--gold-500)] text-[var(--navy-900)] font-semibold rounded-lg hover:bg-[var(--gold-400)] transition disabled:opacity-50"
            >
              {loading ? "Adding..." : "Scrape It"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[var(--navy-700)] border border-[var(--navy-600)] text-[var(--navy-500)] rounded-lg hover:border-[var(--navy-500)] transition"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-4 text-xs text-[var(--navy-500)]">
          Supported: Airbnb, VRBO, Booking.com, and most vacation rental sites.
          Data will be auto-extracted. You can edit anything after scraping.
        </div>
      </div>
    </div>
  );
}
