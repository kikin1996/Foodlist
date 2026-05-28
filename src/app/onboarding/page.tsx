"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "basics" | "diet" | "rohlik";

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
      if (!res.ok) throw new Error("Nepodařilo se uložit nastavení");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {(["basics", "diet", "rohlik"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step === s
                    ? "bg-brand-600 text-white"
                    : ["basics", "diet", "rohlik"].indexOf(step) > i
                    ? "bg-brand-100 text-brand-700"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className={`flex-1 h-1 rounded ${["basics", "diet", "rohlik"].indexOf(step) > i ? "bg-brand-300" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {/* Step 1: Basics */}
          {step === "basics" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Základní nastavení</h2>
                <p className="text-gray-500 text-sm mt-1">Řekněte nám, co potřebujete</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Zdravost <span className="text-brand-600 font-bold">{prefs.healthLevel}/10</span>
                </label>
                <input
                  type="range" min={1} max={10} value={prefs.healthLevel}
                  onChange={(e) => setPrefs({ ...prefs, healthLevel: Number(e.target.value) })}
                  className="w-full accent-brand-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Comfort food</span><span>Maximálně zdravé</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Chutnost <span className="text-brand-600 font-bold">{prefs.tastyLevel}/10</span>
                </label>
                <input
                  type="range" min={1} max={10} value={prefs.tastyLevel}
                  onChange={(e) => setPrefs({ ...prefs, tastyLevel: Number(e.target.value) })}
                  className="w-full accent-brand-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Jednoduché</span><span>Labužník</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Počet osob</label>
                  <input
                    type="number" min={1} max={10} value={prefs.householdSize}
                    onChange={(e) => setPrefs({ ...prefs, householdSize: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Týdenní rozpočet (Kč)</label>
                  <input
                    type="number" min={500} max={10000} step={100} value={prefs.weeklyBudget}
                    onChange={(e) => setPrefs({ ...prefs, weeklyBudget: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Den doručení</label>
                  <select
                    value={prefs.deliveryDay}
                    onChange={(e) => setPrefs({ ...prefs, deliveryDay: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Čas doručení</label>
                  <select
                    value={prefs.deliveryTime}
                    onChange={(e) => setPrefs({ ...prefs, deliveryTime: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="morning">Ráno (7–11)</option>
                    <option value="afternoon">Odpoledne (12–17)</option>
                    <option value="evening">Večer (18–22)</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setStep("diet")}
                className="w-full py-3 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 transition-colors"
              >
                Pokračovat
              </button>
            </div>
          )}

          {/* Step 2: Diet */}
          {step === "diet" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Stravovací preference</h2>
                <p className="text-gray-500 text-sm mt-1">Diety a oblíbené kuchyně</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Stravování</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "isVegetarian", label: "Vegetarián" },
                    { key: "isVegan", label: "Vegan" },
                    { key: "isGlutenFree", label: "Bez lepku" },
                    { key: "isLactoseFree", label: "Bez laktózy" },
                  ].map((d) => (
                    <label
                      key={d.key}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        prefs[d.key as keyof typeof prefs]
                          ? "border-brand-500 bg-brand-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!prefs[d.key as keyof typeof prefs]}
                        onChange={(e) => setPrefs({ ...prefs, [d.key]: e.target.checked })}
                        className="accent-brand-600"
                      />
                      <span className="text-sm font-medium text-gray-700">{d.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Oblíbené kuchyně</label>
                <div className="flex flex-wrap gap-2">
                  {CUISINES.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleCuisine(c)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        prefs.cuisinePreferences.includes(c)
                          ? "bg-brand-600 text-white border-brand-600"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alergie (nepovinné)
                </label>
                <input
                  type="text"
                  value={prefs.allergies}
                  onChange={(e) => setPrefs({ ...prefs, allergies: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="např. ořechy, mořské plody"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Co nechci jíst (nepovinné)
                </label>
                <input
                  type="text"
                  value={prefs.dislikedIngredients}
                  onChange={(e) => setPrefs({ ...prefs, dislikedIngredients: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="např. houby, jater"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("basics")}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Zpět
                </button>
                <button
                  onClick={() => setStep("rohlik")}
                  className="flex-1 py-3 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 transition-colors"
                >
                  Pokračovat
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Rohlik */}
          {step === "rohlik" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Propojení s Rohlík.cz</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Pro automatické nákupy potřebujeme přihlásit se k vašemu Rohlík účtu
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Bezpečnost:</strong> Vaše heslo je zašifrováno pomocí AES-256-GCM
                  a nikdy není sdíleno s třetími stranami. Slouží výhradně pro přidávání
                  položek do vašeho košíku na Rohlík.cz.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email k Rohlík.cz účtu
                </label>
                <input
                  type="email"
                  value={prefs.rohlikEmail}
                  onChange={(e) => setPrefs({ ...prefs, rohlikEmail: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="vas@email.cz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heslo k Rohlík.cz účtu
                </label>
                <input
                  type="password"
                  value={prefs.rohlikPassword}
                  onChange={(e) => setPrefs({ ...prefs, rohlikPassword: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="vaše rohlík heslo"
                />
              </div>

              <p className="text-xs text-gray-400">
                Nemáte ještě Rohlík účet? Přeskočte tento krok a nastavte později v profilu.
                Jídelníček vygenerujeme i bez propojení.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("diet")}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Zpět
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
                  className="flex-1 py-3 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60"
                >
                  {saving ? "Ukládám..." : "Dokončit nastavení"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
