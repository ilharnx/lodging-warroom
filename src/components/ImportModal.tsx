"use client";

import { useState, useRef } from "react";
import { useModal } from "@/hooks/useModal";

interface ImportModalProps {
  tripId: string;
  onClose: () => void;
  onImported: () => void;
}

export function ImportModal({ tripId, onClose, onImported }: ImportModalProps) {
  const [mode, setMode] = useState<"urls" | "csv">("urls");
  const [urlText, setUrlText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    total: number;
    queued: number;
    skipped: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const modalRef = useModal(onClose);

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    const urls = urlText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http"));

    if (urls.length === 0) {
      setError("No valid URLs found. Enter one URL per line.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/trips/${tripId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }

      const data = await res.json();
      setResult(data);

      setTimeout(onImported, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/trips/${tripId}/import`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }

      const data = await res.json();
      setResult(data);

      setTimeout(onImported, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="import-title" className="bg-white border border-[#DDD8D0] rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 id="import-title" className="text-lg font-bold text-[#1a1a1a]">Bulk Import</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#706B65] hover:text-[#1a1a1a] transition"
          >
            &#10005;
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mb-4 bg-[#F3F0EB] rounded-lg p-1">
          <button
            onClick={() => setMode("urls")}
            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition ${
              mode === "urls"
                ? "bg-[#EFEAE4] text-[#1a1a1a] font-medium"
                : "text-[#706B65]"
            }`}
          >
            Paste URLs
          </button>
          <button
            onClick={() => setMode("csv")}
            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition ${
              mode === "csv"
                ? "bg-[#EFEAE4] text-[#1a1a1a] font-medium"
                : "text-[#706B65]"
            }`}
          >
            Upload CSV
          </button>
        </div>

        {result ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-2">&#10003;</div>
            <p className="text-[#1a1a1a] font-semibold">
              {result.queued} listing{result.queued !== 1 ? "s" : ""} queued for
              scraping
            </p>
            {result.skipped > 0 && (
              <p className="text-sm text-[#8B6914] mt-1">
                {result.skipped} skipped (invalid URLs)
              </p>
            )}
            <p className="text-xs text-[#706B65] mt-2">
              Listings will appear on the map as they finish scraping.
            </p>
          </div>
        ) : mode === "urls" ? (
          <form onSubmit={handleUrlSubmit}>
            <textarea
              placeholder={"Paste one URL per line:\nhttps://www.airbnb.com/rooms/123\nhttps://www.vrbo.com/456"}
              value={urlText}
              onChange={(e) => setUrlText(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 bg-[#F3F0EB] border border-[#DDD8D0] rounded-lg text-[#1a1a1a] placeholder:text-[#8a8480] focus:border-[#E94E3C] text-sm font-mono resize-none"
            />
            {error && <p className="mt-2 text-sm text-[#b91c1c]">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full px-4 py-2.5 bg-[#E94E3C] text-white font-semibold rounded-lg hover:bg-[#d4443a] transition disabled:opacity-50"
            >
              {loading ? "Importing..." : "Scrape All"}
            </button>
          </form>
        ) : (
          <div>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
              className="border-2 border-dashed border-[#DDD8D0] rounded-lg p-8 text-center cursor-pointer hover:border-[#E94E3C] transition"
            >
              <div className="text-2xl text-[#706B65] mb-2">
                &#128196;
              </div>
              <p className="text-sm text-[#706B65]">
                Click to upload a CSV file
              </p>
              <p className="text-xs text-[#706B65] mt-1">
                Must have a &quot;url&quot; column
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            {error && <p className="mt-2 text-sm text-[#b91c1c]">{error}</p>}
            {loading && (
              <p className="mt-2 text-sm text-[#E94E3C]">
                Uploading and processing...
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#706B65] hover:text-[#1a1a1a] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
