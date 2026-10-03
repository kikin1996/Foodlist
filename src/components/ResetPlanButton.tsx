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
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="font-semibold text-tomato-600">Opravdu smazat celý týden?</span>
        <button
          onClick={handleReset}
          disabled={loading}
          className="bg-tomato-600 px-4 py-2 font-semibold text-white hover:bg-tomato-500 disabled:opacity-50"
        >
          {loading ? "Mažu…" : "Smazat"}
        </button>
        <button onClick={() => setConfirm(false)} className="font-semibold text-gray-600 hover:text-gray-900">
          Zpět
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-sm font-semibold text-gray-500 underline underline-offset-4 hover:text-tomato-600"
    >
      Smazat tento týden
    </button>
  );
}
