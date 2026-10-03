"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorBox, primaryButton, secondaryButton } from "@/components/ui";

interface Props {
  label?: string;
  archiveId?: string;
}

export default function GeneratePlanButton({ label = "Vygenerovat jídelníček", archiveId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/meal-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archiveId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generování se nepovedlo.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    } finally {
      setLoading(false);
    }
  }

  const isPrimary = !archiveId;

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className={isPrimary ? primaryButton : secondaryButton}
      >
        {loading ? "Generuji… 30 až 60 sekund" : label}
      </button>
      {error && <p className={`${errorBox} max-w-md`}>{error}</p>}
    </div>
  );
}
