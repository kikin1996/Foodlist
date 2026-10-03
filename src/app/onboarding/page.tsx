"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorBox, field, label, primaryButton, secondaryButton } from "@/components/ui";

type Step = "basics" | "diet" | "rohlik";

const STEPS: { key: Step; label: string }[] = [
  { key: "basics", label: "Základ" },
  { key: "diet", label: "Jídlo" },
  { key: "rohlik", label: "Rohlík" },
];

const DAYS = [
  { value: "monday", label: "Pondělí" },
  { value: "tuesday", label: "Úterý" },
  { value: "wednesday", label: "Středa" },
  { value: "thursday", label: "Čtvrtek" },
  { value: "friday", label: "Pátek" },
  { value: "saturday", label: "Sobota" },
  { value: "sunday", label: "Neděle" },
];

const CUISINES = ["česká", "italská", "asijská", "mexická", "středomořská", "americká"];

const DIETS = [
  { key: "isVegetarian", label: "Vegetariánská" },
  { key: "isVegan", label: "Veganská" },
  { key: "isGlutenFree", label: "Bez lepku" },
  { key: "isLactoseFree", label: "Bez laktózy" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("basics");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [prefs, setPrefs] = useState({
    healthLevel: 7,
    tastyLevel: 7,
    householdSize: 2,
    weeklyBudget: 2000,
    deliveryDay: "wednesday",
    deliveryTime: "morning",
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isLactoseFree: false,
    allergies: "",
    cuisinePreferences: [] as string[],
    dislikedIngredients: "",
    rohlikEmail: "",
    rohlikPassword: "",
  });

  const currentIndex = STEPS.findIndex((s) => s.key === step);

  function toggleCuisine(c: string) {
    setPrefs((p) => ({
      ...p,
      cuisinePreferences: p.cuisinePreferences.includes(c)
        ? p.cuisinePreferences.filter((x) => x !== c)
        : [...p.cuisinePreferences, c],
    }));
  }

  async function handleFinish() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prefs,
          cuisinePreferences: prefs.cuisinePreferences.join(","),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Nastavení se nepodařilo uložit.");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-start justify-center px-5 py-12">
      <div className="w-full max-w-lg">
        <span className="font-display text-2xl font-extrabold text-brand-600">Kostki</span>

        <ol className="mt-8 flex gap-6 border-b-2 border-gray-900 text-sm font-semibold">
          {STEPS.map((s, i) => (
            <li
              key={s.key}
              aria-current={step === s.key ? "step" : undefined}
              className={`-mb-0.5 border-b-4 pb-3 ${
                i === currentIndex
                  ? "border-brand-600 text-brand-600"
                  : i < currentIndex
                  ? "border-transparent text-gray-900"
                  : "border-transparent text-gray-400"
              }`}
            >
              {i + 1}. {s.label}
            </li>
          ))}
        </ol>

        {step === "basics" && (
          <div className="mt-10 space-y-7">
            <div>
              <h1 className="text-3xl font-extrabold">Co jíte a kolik vás je</h1>
            </div>

            <div>
              <label className={label}>
                Zdravost <span className="font-display text-brand-600">{prefs.healthLevel}/10</span>
              </label>
              <input
                type="range" min={1} max={10} value={prefs.healthLevel}
                onChange={(e) => setPrefs({ ...prefs, healthLevel: Number(e.target.value) })}
                className="w-full accent-brand-600"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Spíš comfort food</span><span>Co nejzdravější</span>
              </div>
            </div>

            <div>
              <label className={label}>
                Chutnost <span className="font-display text-brand-600">{prefs.tastyLevel}/10</span>
              </label>
              <input
                type="range" min={1} max={10} value={prefs.tastyLevel}
                onChange={(e) => setPrefs({ ...prefs, tastyLevel: Number(e.target.value) })}
                className="w-full accent-brand-600"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Jednoduché</span><span>Labužnické</span>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={label}>Lidí u stolu</label>
                <input
                  type="number" min={1} max={10} value={prefs.householdSize}
                  onChange={(e) => setPrefs({ ...prefs, householdSize: Number(e.target.value) })}
                  className={field}
                />
              </div>
              <div>
                <label className={label}>Rozpočet na týden (Kč)</label>
                <input
                  type="number" min={500} max={10000} step={100} value={prefs.weeklyBudget}
                  onChange={(e) => setPrefs({ ...prefs, weeklyBudget: Number(e.target.value) })}
                  className={field}
                />
              </div>
              <div>
                <label className={label}>Den doručení</label>
                <select
                  value={prefs.deliveryDay}
                  onChange={(e) => setPrefs({ ...prefs, deliveryDay: e.target.value })}
                  className={field}
                >
                  {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Čas doručení</label>
                <select
                  value={prefs.deliveryTime}
                  onChange={(e) => setPrefs({ ...prefs, deliveryTime: e.target.value })}
                  className={field}
                >
                  <option value="morning">Ráno (7–11)</option>
                  <option value="afternoon">Odpoledne (12–17)</option>
                  <option value="evening">Večer (18–22)</option>
                </select>
              </div>
            </div>

            <button onClick={() => setStep("diet")} className={`${primaryButton} w-full`}>
              Pokračovat
            </button>
          </div>
        )}

        {step === "diet" && (
          <div className="mt-10 space-y-7">
            <h1 className="text-3xl font-extrabold">Co nejíte a co máte rádi</h1>

            <div>
              <span className={label}>Stravování</span>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {DIETS.map((d) => (
                  <label key={d.key} className="flex cursor-pointer items-center gap-3 py-1.5 text-[0.95rem]">
                    <input
                      type="checkbox"
                      checked={!!prefs[d.key as keyof typeof prefs]}
                      onChange={(e) => setPrefs({ ...prefs, [d.key]: e.target.checked })}
                      className="h-4 w-4 accent-brand-600"
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span className={label}>Oblíbené kuchyně</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {CUISINES.map((c) => {
                  const active = prefs.cuisinePreferences.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleCuisine(c)}
                      className={`border-2 px-3 py-2 text-sm font-semibold transition-colors ${
                        active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-700 hover:border-gray-900"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={label}>Alergie (nepovinné)</label>
                <input
                  type="text"
                  value={prefs.allergies}
                  onChange={(e) => setPrefs({ ...prefs, allergies: e.target.value })}
                  className={field}
                  placeholder="ořechy, mořské plody"
                />
              </div>
              <div>
                <label className={label}>Co nechci jíst (nepovinné)</label>
                <input
                  type="text"
                  value={prefs.dislikedIngredients}
                  onChange={(e) => setPrefs({ ...prefs, dislikedIngredients: e.target.value })}
                  className={field}
                  placeholder="houby, játra"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("basics")} className={`${secondaryButton} flex-1`}>
                Zpět
              </button>
              <button onClick={() => setStep("rohlik")} className={`${primaryButton} flex-1`}>
                Pokračovat
              </button>
            </div>
          </div>
        )}

        {step === "rohlik" && (
          <div className="mt-10 space-y-7">
            <div>
              <h1 className="text-3xl font-extrabold">Rohlík.cz (nepovinné)</h1>
              <p className="mt-3 leading-relaxed text-gray-600">
                S účtem najdeme produkty, které jsou dnes skladem, a přidáme k nim odkazy.
                Bez účtu vám jídelníček vyjde také, jen bez konkrétních produktů.
              </p>
            </div>

            <p className="border-l-4 border-gray-900 bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
              Heslo se ukládá zašifrované (AES-256-GCM). Používáme ho jen ke čtení nabídky na Rohlík.cz.
            </p>

            <div className="grid gap-5">
              <div>
                <label className={label}>Email k Rohlík.cz</label>
                <input
                  type="email"
                  value={prefs.rohlikEmail}
                  onChange={(e) => setPrefs({ ...prefs, rohlikEmail: e.target.value })}
                  className={field}
                  placeholder="vas@email.cz"
                />
              </div>
              <div>
                <label className={label}>Heslo k Rohlík.cz</label>
                <input
                  type="password"
                  value={prefs.rohlikPassword}
                  onChange={(e) => setPrefs({ ...prefs, rohlikPassword: e.target.value })}
                  className={field}
                />
              </div>
            </div>

            {error && <div className={errorBox}>{error}</div>}

            <div className="flex gap-3">
              <button onClick={() => setStep("diet")} className={`${secondaryButton} flex-1`}>
                Zpět
              </button>
              <button onClick={handleFinish} disabled={saving} className={`${primaryButton} flex-1`}>
                {saving ? "Ukládám…" : "Dokončit nastavení"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
