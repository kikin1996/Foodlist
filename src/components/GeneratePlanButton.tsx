"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  label?: string;
}

export default function GeneratePlanButton({ label = "Vygenerovat jídelníček" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/meal-plan/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generování selhalo");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nastala chyba");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            AI generuje jídelníček...
          </>
        ) : (
          <>🤖 {label}</>
        )}
      </button>
      {loading && (
        <p className="text-sm text-gray-500">Může to trvat 30–60 sekund</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
