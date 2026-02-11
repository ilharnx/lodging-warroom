"use client";

import { useState } from "react";
import { useModal } from "@/hooks/useModal";

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
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState<"single" | "multi">("single");
  const modalRef = useModal(onClose);

  function parseUrls(text: string): string[] {
    return text
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.startsWith("http"));
  }

  const urls = mode === "multi" ? parseUrls(input) : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError("");

    if (mode === "single") {
      // Single URL
      setStatus("Adding listing...");
      try {
        const res = await fetch(`/api/trips/${tripId}/listings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: input.trim(), addedBy }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to add listing");
        }

        setStatus("Scraping started! The listing will update automatically.");
        setTimeout(onAdded, 800);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setLoading(false);
      }
    } else {
      // Multi-URL
      const urlList = parseUrls(input);
      if (urlList.length === 0) {
        setError("No valid URLs found. Each URL should start with http.");
        setLoading(false);
        return;
      }

      setStatus(`Adding ${urlList.length} listing${urlList.length !== 1 ? "s" : ""}...`);
      try {
        const res = await fetch(`/api/trips/${tripId}/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: urlList }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to import listings");
        }

        const data = await res.json();
        setStatus(
          `${data.queued} listing${data.queued !== 1 ? "s" : ""} queued for scraping!`
        );
        setTimeout(onAdded, 1200);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setLoading(false);
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="add-listing-title" className="bg-white border border-[#DDD8D0] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 id="add-listing-title" className="text-lg font-bold text-[#1a1a1a]">Add Listings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#636058] hover:text-[#1a1a1a] transition"
          >
            &#10005;
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 mb-4 p-1 bg-[#F3F0EB] rounded-lg">
          <button
            type="button"
            onClick={() => { setMode("single"); setInput(""); setError(""); setStatus(""); }}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition ${
              mode === "single"
                ? "bg-[#EFEAE4] text-[#1a1a1a]"
                : "text-[#636058] hover:text-[#1a1a1a]"
            }`}
          >
            Single URL
          </button>
          <button
            type="button"
            onClick={() => { setMode("multi"); setInput(""); setError(""); setStatus(""); }}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition ${
              mode === "multi"
                ? "bg-[#EFEAE4] text-[#1a1a1a]"
                : "text-[#636058] hover:text-[#1a1a1a]"
            }`}
          >
            Multiple URLs
          </button>
        </div>

        <p className="text-sm text-[#636058] mb-4">
          {mode === "single"
            ? "Paste a listing URL from Airbnb, VRBO, Booking.com, or any vacation rental site."
            : "Paste multiple URLs, one per line. They'll all be scraped in parallel."}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "single" ? (
            <input
              type="url"
              required
              placeholder="https://www.airbnb.com/rooms/12345678"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 bg-[#F3F0EB] border border-[#DDD8D0] rounded-lg text-[#1a1a1a] placeholder:text-[#8a8480] focus:border-[#E94E3C] text-sm"
            />
          ) : (
            <div className="relative">
              <textarea
                required
                placeholder={"https://www.vrbo.com/12345\nhttps://www.airbnb.com/rooms/67890\nhttps://www.booking.com/hotel/..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
                rows={5}
                className="w-full px-4 py-3 bg-[#F3F0EB] border border-[#DDD8D0] rounded-lg text-[#1a1a1a] placeholder:text-[#8a8480] focus:border-[#E94E3C] text-sm resize-none"
              />
              {urls.length > 0 && (
                <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#E94E3C]/20 text-[#E94E3C] text-[10px] font-semibold rounded">
                  {urls.length} URL{urls.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="mt-2 text-sm text-[#b91c1c]">{error}</p>
          )}

          {status && !error && (
            <p className="mt-2 text-sm text-[#15803d]">{status}</p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[#E94E3C] text-white font-semibold rounded-lg hover:bg-[#d4443a] transition disabled:opacity-50"
            >
              {loading
                ? "Adding..."
                : mode === "single"
                  ? "Scrape It"
                  : `Scrape ${urls.length || ""} Listing${urls.length !== 1 ? "s" : ""}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#EFEAE4] border border-[#DDD8D0] text-[#636058] rounded-lg hover:border-[#bbb] transition"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-4 text-xs text-[#706B65]">
          Supported: Airbnb, VRBO, Booking.com, and most vacation rental sites.
          Data will be auto-extracted. You can edit anything after scraping.
        </div>
      </div>
    </div>
  );
}
