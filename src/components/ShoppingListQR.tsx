"use client";

import { useState } from "react";
import { secondaryButton } from "./ui";

export default function ShoppingListQR({ mealPlanId }: { mealPlanId: string }) {
  const [open, setOpen] = useState(false);
  const listUrl = typeof window !== "undefined" ? `${window.location.origin}/list/${mealPlanId}` : "";

  return (
    <div className="flex flex-col items-start gap-3">
      <button onClick={() => setOpen((v) => !v)} className={secondaryButton} aria-expanded={open}>
        {open ? "Skrýt QR kód" : "Ukázat QR kód"}
      </button>
      {open && (
        <div className="flex flex-col gap-3 border-2 border-gray-900 bg-white p-4 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/meal-plan/${mealPlanId}/qrcode`}
            alt="QR kód nákupního seznamu"
            width={180}
            height={180}
          />
          <div className="max-w-[16rem] space-y-2 text-sm text-gray-600">
            <p>Naskenujte mobilem. Seznam se otevře a můžete ho uložit do fotek nebo si ho udělat screenshot.</p>
            {listUrl && (
              <a
                href={listUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-600 underline underline-offset-4"
              >
                Otevřít seznam tady
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
