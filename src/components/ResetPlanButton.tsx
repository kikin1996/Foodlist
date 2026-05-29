"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPlanButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleReset() {
    setLoading(true);
    await fetch("/api/meal-plan/reset", { method: "POST" });
    router.refresh();
    setLoading(false);
    setConfirm(false);
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Smazat jídelníček?</span>
        <button
          onClick={handleReset}
          disabled={loading}
          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
        >
          {loading ? "Mažu..." : "Ano, smazat"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="px-3 py-1.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          Zrušit
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="px-3 py-1.5 border border-gray-200 text-gray-500 text-sm rounded-lg hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-colors"
    >
      🗑 Smazat jídelníček
    </button>
  );
}
