"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorBox, secondaryButton } from "@/components/ui";

export default function RefreshCatalogButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRefresh() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/catalog", { method: "POST" });
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Server nestihl odpovědět (${res.status}). Zkuste to znovu.`);
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Aktualizace se nepovedla.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <button onClick={handleRefresh} disabled={loading} className={secondaryButton}>
        {loading ? "Stahuji katalog, to trvá asi 2 minuty…" : "Aktualizovat katalog"}
      </button>
      {error && <p className={`${errorBox} max-w-sm`}>{error}</p>}
    </div>
  );
}
