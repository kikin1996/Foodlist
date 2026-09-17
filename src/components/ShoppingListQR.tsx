"use client";

import { useState } from "react";

export default function ShoppingListQR({ mealPlanId }: { mealPlanId: string }) {
  const [open, setOpen] = useState(false);
  const listUrl = typeof window !== "undefined" ? `${window.location.origin}/list/${mealPlanId}` : "";

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
      >
        📱 QR seznam
      </button>
      {open && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/meal-plan/${mealPlanId}/qrcode`}
            alt="QR kód nákupního seznamu"
            width={200}
            height={200}
            className="rounded-lg"
          />
          <p className="text-xs text-gray-500 text-center max-w-[220px]">
            Naskenuj mobilem — otevře se nákupní seznam, který si můžeš uložit do fotek
          </p>
          {listUrl && (
            <a href={listUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">
              nebo otevři odkaz přímo
            </a>
          )}
        </div>
      )}
    </div>
  );
}
