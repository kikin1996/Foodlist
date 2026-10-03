"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorBox, field, label, primaryButton, successBox } from "@/components/ui";

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
  { value: "breakfast", label: "Snídaně" },
  { value: "lunch", label: "Oběd" },
  { value: "dinner", label: "Večeře" },
];

const DELIVERY_DAYS = [
  { value: "monday", label: "Pondělí" },
  { value: "tuesday", label: "Úterý" },
  { value: "wednesday", label: "Středa" },
  { value: "thursday", label: "Čtvrtek" },
  { value: "friday", label: "Pátek" },
  { value: "saturday", label: "Sobota" },
  { value: "sunday", label: "Neděle" },
];

const APPLIANCES = [
  { value: "none", label: "Žádný", desc: "Klasické vaření" },
  { value: "thermomix", label: "Thermomix", desc: "Postup s nastavením" },
  { value: "monsieur_cuisine", label: "Monsieur Cuisine", desc: "Postup s nastavením" },
];

const AI_MODELS = [
  { value: "gpt-5-nano", label: "Nano", desc: "Rychlý a levný" },
  { value: "gpt-5-mini", label: "Mini", desc: "Vyvážený" },
  { value: "gpt-5.1", label: "5.1", desc: "Nejlepší kvalita" },
];

const DIETS = [
  { key: "isVegetarian", label: "Vegetariánská" },
  { key: "isVegan", label: "Veganská" },
  { key: "isGlutenFree", label: "Bez lepku" },
  { key: "isLactoseFree", label: "Bez laktózy" },
];

const CUISINES = ["česká", "italská", "asijská", "mexická", "středomořská", "americká"];

const SECTION = "border-t-2 border-gray-900 pt-8 pb-10";

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
    kitchenAppliance: string;
  };
}

function choiceClass(active: boolean) {
  return `border-2 px-3 py-2 text-sm font-semibold transition-colors ${
    active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 text-gray-700 hover:border-gray-900"
  }`;
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

  function toggle(key: "includedMeals" | "includedDays" | "cuisinePreferences", value: string) {
    setForm((p) => ({
      ...p,
      [key]: p[key].includes(value) ? p[key].filter((x) => x !== value) : [...p[key], value],
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
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Nastavení se nepodařilo uložit.");
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Něco se pokazilo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <section className={SECTION}>
        <h2 className="text-2xl font-bold">Jak jíte</h2>
        <div className="mt-6 space-y-7">
          <div>
            <label className={label}>
              Zdravost <span className="font-display text-brand-600">{form.healthLevel}/10</span>
            </label>
            <input
              type="range" min={1} max={10} value={form.healthLevel}
              onChange={(e) => setForm({ ...form, healthLevel: Number(e.target.value) })}
              className="w-full accent-brand-600"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>Spíš comfort food</span><span>Co nejzdravější</span>
            </div>
          </div>

          <div>
            <label className={label}>
              Chutnost <span className="font-display text-brand-600">{form.tastyLevel}/10</span>
            </label>
            <input
              type="range" min={1} max={10} value={form.tastyLevel}
              onChange={(e) => setForm({ ...form, tastyLevel: Number(e.target.value) })}
              className="w-full accent-brand-600"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={label}>Lidí u stolu</label>
              <input
                type="number" min={1} max={10} value={form.householdSize}
                onChange={(e) => setForm({ ...form, householdSize: Number(e.target.value) })}
                className={field}
              />
            </div>
            <div>
              <label className={label}>Rozpočet na týden (Kč)</label>
              <input
                type="number" min={500} max={10000} step={100} value={form.weeklyBudget}
                onChange={(e) => setForm({ ...form, weeklyBudget: Number(e.target.value) })}
                className={field}
              />
            </div>
          </div>

          <div>
            <span className={label}>Diety</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {DIETS.map((d) => (
                <label key={d.key} className="flex cursor-pointer items-center gap-3 py-1.5 text-[0.95rem]">
                  <input
                    type="checkbox"
                    checked={!!form[d.key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [d.key]: e.target.checked })}
                    className="h-4 w-4 accent-brand-600"
                  />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={label}>Alergie</label>
              <input
                type="text"
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                className={field}
                placeholder="ořechy, mořské plody"
              />
            </div>
            <div>
              <label className={label}>Co nechci jíst</label>
              <input
                type="text"
                value={form.dislikedIngredients}
                onChange={(e) => setForm({ ...form, dislikedIngredients: e.target.value })}
                className={field}
                placeholder="houby, játra"
              />
            </div>
          </div>

          <div>
            <span className={label}>Oblíbené kuchyně</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {CUISINES.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={form.cuisinePreferences.includes(c)}
                  onClick={() => toggle("cuisinePreferences", c)}
                  className={choiceClass(form.cuisinePreferences.includes(c))}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <h2 className="text-2xl font-bold">Co plánovat</h2>
        <div className="mt-6 space-y-7">
          <div>
            <span className={label}>Chody</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {MEALS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={form.includedMeals.includes(m.value)}
                  onClick={() => toggle("includedMeals", m.value)}
                  className={choiceClass(form.includedMeals.includes(m.value))}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={label}>Dny</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {PLAN_DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  aria-pressed={form.includedDays.includes(d.value)}
                  onClick={() => toggle("includedDays", d.value)}
                  className={choiceClass(form.includedDays.includes(d.value))}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={label}>Den doručení</label>
              <select
                value={form.deliveryDay}
                onChange={(e) => setForm({ ...form, deliveryDay: e.target.value })}
                className={field}
              >
                {DELIVERY_DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Čas doručení</label>
              <select
                value={form.deliveryTime}
                onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                className={field}
              >
                <option value="morning">Ráno (7–11)</option>
                <option value="afternoon">Odpoledne (12–17)</option>
                <option value="evening">Večer (18–22)</option>
              </select>
            </div>
          </div>

          <div>
            <span className={label}>Kuchyňský robot</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {APPLIANCES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  aria-pressed={form.kitchenAppliance === a.value}
                  onClick={() => setForm({ ...form, kitchenAppliance: a.value })}
                  className={`border-2 p-3 text-left transition-colors ${
                    form.kitchenAppliance === a.value ? "border-brand-600 bg-brand-50" : "border-gray-300 hover:border-gray-900"
                  }`}
                >
                  <div className="font-semibold">{a.label}</div>
                  <div className="text-xs text-gray-600">{a.desc}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Jídla vhodná pro robot se budou preferovat, jen tam, kde to dává smysl.
            </p>
          </div>

          <div>
            <span className={label}>AI model</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {AI_MODELS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={form.aiModel === m.value}
                  onClick={() => setForm({ ...form, aiModel: m.value })}
                  className={`border-2 p-3 text-left transition-colors ${
                    form.aiModel === m.value ? "border-brand-600 bg-brand-50" : "border-gray-300 hover:border-gray-900"
                  }`}
                >
                  <div className="font-semibold">{m.label}</div>
                  <div className="text-xs text-gray-600">{m.desc}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-600">Výkonnější model píše lepší jídelníčky, ale generuje déle.</p>
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <h2 className="text-2xl font-bold">Rohlík.cz</h2>
        <p className="mt-3 leading-relaxed text-gray-600">
          Účet je nepovinný. Při vyplnění se katalog použije k přesnějším názvům a cenám a k odkazům na produkty.
          Heslo se ukládá zašifrované (AES-256-GCM). Pole s heslem nechte prázdné, pokud ho nechcete měnit.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label}>Email na Rohlík.cz</label>
            <input
              type="email"
              value={form.rohlikEmail}
              onChange={(e) => setForm({ ...form, rohlikEmail: e.target.value })}
              className={field}
              placeholder="vas@email.cz"
            />
          </div>
          <div>
            <label className={label}>Heslo na Rohlík.cz</label>
            <input
              type="password"
              value={form.rohlikPassword}
              onChange={(e) => setForm({ ...form, rohlikPassword: e.target.value })}
              className={field}
              placeholder="nové heslo, nebo prázdné"
            />
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {error && <div className={errorBox}>{error}</div>}
        {saved && <div className={successBox}>Nastavení je uložené.</div>}
        <button onClick={handleSave} disabled={saving} className={primaryButton}>
          {saving ? "Ukládám…" : "Uložit nastavení"}
        </button>
      </div>
    </div>
  );
}
