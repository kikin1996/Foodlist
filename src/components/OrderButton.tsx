"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrderButton({ mealPlanId }: { mealPlanId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleOrder() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/meal-plan/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealPlanId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Objednávka selhala");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nastala chyba");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleOrder}
        disabled={loading}
        className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60 flex items-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Nakupuji na Rohlíku...
          </>
        ) : (
          "🛒 Nakoupit na Rohlíku"
        )}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
