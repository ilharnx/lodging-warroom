"use client";

import { useState, useRef } from "react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--navy-800)] border border-[var(--navy-600)] rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Bulk Import</h2>
          <button
            onClick={onClose}
            className="text-[var(--navy-500)] hover:text-white transition"
          >
            &#10005;
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mb-4 bg-[var(--navy-900)] rounded-lg p-1">
          <button
            onClick={() => setMode("urls")}
            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition ${
              mode === "urls"
                ? "bg-[var(--navy-700)] text-white font-medium"
                : "text-[var(--navy-500)]"
            }`}
          >
            Paste URLs
          </button>
          <button
            onClick={() => setMode("csv")}
            className={`flex-1 px-3 py-1.5 text-sm rounded-md transition ${
              mode === "csv"
                ? "bg-[var(--navy-700)] text-white font-medium"
                : "text-[var(--navy-500)]"
            }`}
          >
            Upload CSV
          </button>
        </div>

        {result ? (
          <div className="text-center py-4">
            <div className="text-2xl mb-2">&#10003;</div>
            <p className="text-white font-semibold">
              {result.queued} listing{result.queued !== 1 ? "s" : ""} queued for
              scraping
            </p>
            {result.skipped > 0 && (
              <p className="text-sm text-yellow-400 mt-1">
                {result.skipped} skipped (invalid URLs)
              </p>
            )}
            <p className="text-xs text-[var(--navy-500)] mt-2">
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
              className="w-full px-4 py-3 bg-[var(--navy-900)] border border-[var(--navy-600)] rounded-lg text-white placeholder:text-[var(--navy-500)] focus:outline-none focus:border-[var(--gold-500)] text-sm font-mono resize-none"
            />
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full px-4 py-2.5 bg-[var(--gold-500)] text-[var(--navy-900)] font-semibold rounded-lg hover:bg-[var(--gold-400)] transition disabled:opacity-50"
            >
              {loading ? "Importing..." : "Scrape All"}
            </button>
          </form>
        ) : (
          <div>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[var(--navy-600)] rounded-lg p-8 text-center cursor-pointer hover:border-[var(--gold-500)] transition"
            >
              <div className="text-2xl text-[var(--navy-500)] mb-2">
                &#128196;
              </div>
              <p className="text-sm text-[var(--navy-500)]">
                Click to upload a CSV file
              </p>
              <p className="text-xs text-[var(--navy-500)] mt-1">
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
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            {loading && (
              <p className="mt-2 text-sm text-[var(--gold-400)]">
                Uploading and processing...
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[var(--navy-500)] hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
