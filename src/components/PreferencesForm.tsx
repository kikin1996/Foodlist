"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DELIVERY_DAYS = [
  { value: "monday", label: "Pondělí" },
  { value: "tuesday", label: "Úterý" },
  { value: "wednesday", label: "Středa" },
  { value: "thursday", label: "Čtvrtek" },
  { value: "friday", label: "Pátek" },
  { value: "saturday", label: "Sobota" },
  { value: "sunday", label: "Neděle" },
];

const PLAN_DAYS = [
  { value: "pondeli", label: "Po" },
  { value: "utery", label: "Út" },
  { value: "streda", label: "St" },
  { value: "ctvrtek", label: "Čt" },
  { value: "patek", label: "Pá" },
  { value: "sobota", label: "So" },
  { value: "nedele", label: "Ne" },
];

const MEALS = [
  { value: "breakfast", label: "🌅 Snídaně" },
  { value: "lunch", label: "🍽️ Oběd" },
  { value: "dinner", label: "🌙 Večeře" },
];

const CUISINES = ["česká", "italská", "asijská", "mexická", "středomořská", "americká"];

interface Props {
  initialData: {
    healthLevel: number;
    tastyLevel: number;
    householdSize: number;
    weeklyBudget: number;
    deliveryDay: string;
    deliveryTime: string;
    isVegetarian: boolean;
    isVegan: boolean;
    isGlutenFree: boolean;
    isLactoseFree: boolean;
    allergies: string;
    cuisinePreferences: string;
    dislikedIngredients: string;
    rohlikEmail: string;
    includedMeals: string;
    includedDays: string;
    aiModel: string;
  };
}

export default function PreferencesForm({ initialData }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    ...initialData,
    cuisinePreferences: initialData.cuisinePreferences
      ? initialData.cuisinePreferences.split(",").filter(Boolean)
      : [] as string[],
    includedMeals: initialData.includedMeals
      ? initialData.includedMeals.split(",").filter(Boolean)
      : ["breakfast", "lunch", "dinner"],
    includedDays: initialData.includedDays
      ? initialData.includedDays.split(",").filter(Boolean)
      : ["pondeli", "utery", "streda", "ctvrtek", "patek", "sobota", "nedele"],
    rohlikPassword: "",
  });

  function toggleMeal(m: string) {
    setForm((p) => ({
      ...p,
      includedMeals: p.includedMeals.includes(m)
        ? p.includedMeals.filter((x) => x !== m)
        : [...p.includedMeals, m],
    }));
  }

  function togglePlanDay(d: string) {
    setForm((p) => ({
      ...p,
      includedDays: p.includedDays.includes(d)
        ? p.includedDays.filter((x) => x !== d)
        : [...p.includedDays, d],
    }));
  }

  function toggleCuisine(c: string) {
    setForm((p) => ({
      ...p,
      cuisinePreferences: p.cuisinePreferences.includes(c)
        ? p.cuisinePreferences.filter((x) => x !== c)
        : [...p.cuisinePreferences, c],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cuisinePreferences: form.cuisinePreferences.join(","),
          includedMeals: form.includedMeals.join(","),
          includedDays: form.includedDays.join(","),
        }),
      });
      if (!res.ok) throw new Error("Uložení selhalo");
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <h2 className="font-semibold text-gray-900">Jídelní preference</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Zdravost <span className="text-brand-600 font-bold">{form.healthLevel}/10</span>
          </label>
          <input
            type="range" min={1} max={10} value={form.healthLevel}
            onChange={(e) => setForm({ ...form, healthLevel: Number(e.target.value) })}
            className="w-full accent-brand-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Comfort food</span><span>Maximálně zdravé</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Chutnost <span className="text-brand-600 font-bold">{form.tastyLevel}/10</span>
          </label>
          <input
            type="range" min={1} max={10} value={form.tastyLevel}
            onChange={(e) => setForm({ ...form, tastyLevel: Number(e.target.value) })}
            className="w-full accent-brand-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Počet osob</label>
            <input
              type="number" min={1} max={10} value={form.householdSize}
              onChange={(e) => setForm({ ...form, householdSize: Number(e.target.value) })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Týdenní rozpočet (Kč)</label>
            <input
              type="number" min={500} max={10000} step={100} value={form.weeklyBudget}
              onChange={(e) => setForm({ ...form, weeklyBudget: Number(e.target.value) })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Den doručení</label>
            <select
              value={form.deliveryDay}
              onChange={(e) => setForm({ ...form, deliveryDay: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {DELIVERY_DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Čas doručení</label>
            <select
              value={form.deliveryTime}
              onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="morning">Ráno (7–11)</option>
              <option value="afternoon">Odpoledne (12–17)</option>
              <option value="evening">Večer (18–22)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Diety</label>
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
                  form[d.key as keyof typeof form]
                    ? "border-brand-500 bg-brand-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!form[d.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [d.key]: e.target.checked })}
                  className="accent-brand-600"
                />
                <span className="text-sm font-medium text-gray-700">{d.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Které chody chceš plánovat</label>
          <div className="flex gap-3">
            {MEALS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => toggleMeal(m.value)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.includedMeals.includes(m.value)
                    ? "bg-brand-600 text-white border-brand-600"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Které dny plánovat</label>
          <div className="flex gap-2">
            {PLAN_DAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => togglePlanDay(d.value)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.includedDays.includes(d.value)
                    ? "bg-brand-600 text-white border-brand-600"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">AI model pro generování jídelníčku</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "claude-haiku-4-5-20251001", label: "Haiku 4.5", desc: "Rychlý, levný", badge: "⚡" },
              { value: "claude-sonnet-4-6", label: "Sonnet 4.6", desc: "Vyvážený", badge: "⚖️" },
              { value: "claude-opus-4-8", label: "Opus 4.8", desc: "Nejlepší kvalita", badge: "🏆" },
            ].map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setForm({ ...form, aiModel: m.value })}
                className={`p-3 rounded-xl border-2 text-left transition-colors ${
                  form.aiModel === m.value
                    ? "border-brand-500 bg-brand-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-xl mb-1">{m.badge}</div>
                <div className="font-semibold text-gray-900 text-sm">{m.label}</div>
                <div className="text-xs text-gray-500">{m.desc}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Opus generuje kreativnější jídelníčky ale je pomalejší (~60s)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Oblíbené kuchyně</label>
          <div className="flex flex-wrap gap-2">
            {CUISINES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCuisine(c)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  form.cuisinePreferences.includes(c)
                    ? "bg-brand-600 text-white border-brand-600"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alergie</label>
            <input
              type="text"
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="ořechy, mořské plody..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Co nechci jíst</label>
            <input
              type="text"
              value={form.dislikedIngredients}
              onChange={(e) => setForm({ ...form, dislikedIngredients: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="houby, játra..."
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Propojení s Rohlík.cz</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Heslo je šifrováno AES-256-GCM. Ponechte prázdné pro zachování stávajícího hesla.
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rohlík email</label>
          <input
            type="email"
            value={form.rohlikEmail}
            onChange={(e) => setForm({ ...form, rohlikEmail: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="vas@email.cz"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rohlík heslo (ponechte prázdné pro zachování)
          </label>
          <input
            type="password"
            value={form.rohlikPassword}
            onChange={(e) => setForm({ ...form, rohlikPassword: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="nové heslo nebo prázdné"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          Nastavení bylo uloženo.
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors disabled:opacity-60"
      >
        {saving ? "Ukládám..." : "Uložit nastavení"}
      </button>
    </div>
  );
}
