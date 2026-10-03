"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ShoppingListQR from "./ShoppingListQR";
import { errorBox, secondaryButton } from "./ui";

const DAY_LABELS: Record<string, string> = {
  pondeli: "Pondělí",
  utery: "Úterý",
  streda: "Středa",
  ctvrtek: "Čtvrtek",
  patek: "Pátek",
  sobota: "Sobota",
  nedele: "Neděle",
};

const DAY_ORDER = ["pondeli", "utery", "streda", "ctvrtek", "patek", "sobota", "nedele"];

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Snídaně",
  lunch: "Oběd",
  dinner: "Večeře",
};

const APPLIANCE_NAMES: Record<string, string> = {
  thermomix: "Thermomix",
  monsieur_cuisine: "Monsieur Cuisine",
};

const CATEGORY_LABELS: Record<string, string> = {
  zelenina: "Zelenina a ovoce",
  ovoce: "Ovoce",
  maso: "Maso a ryby",
  mlecne: "Mléčné",
  pecivo: "Pečivo",
  suche: "Suché potraviny",
  napoje: "Nápoje",
  ostatni: "Ostatní",
};

type Tab = "meals" | "shopping" | "recipes";

type RecipeData = {
  name: string;
  time: number;
  servings: number;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  calories: number;
  applianceSuitable?: boolean;
  applianceVersion?: { steps: string[] };
};

interface MealPlanViewProps {
  kitchenAppliance?: string;
  plan: {
    id: string;
    meals: unknown;
    recipes: unknown;
    shoppingList: unknown;
    status: string;
  };
}

export default function MealPlanView({ plan, kitchenAppliance = "none" }: MealPlanViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("meals");
  const [closedCategories, setClosedCategories] = useState<Record<string, boolean>>({});
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [applianceVersions, setApplianceVersions] = useState<Record<string, { steps: string[] }>>({});
  const [applianceLoading, setApplianceLoading] = useState(false);
  const [applianceError, setApplianceError] = useState("");
  const [regenSlot, setRegenSlot] = useState<string | null>(null);
  const [regenError, setRegenError] = useState("");

  const meals = plan.meals as Record<string, Record<string, string>>;
  const recipes = plan.recipes as Record<string, RecipeData>;
  const shoppingList = plan.shoppingList as {
    name: string; amount: string; unit: string; category: string; rohlikUrl?: string;
  }[];

  const days = Object.keys(meals).sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const categories = Array.from(new Set(shoppingList.map((i) => i.category)));
  const recipe = selectedRecipe ? recipes[selectedRecipe] : null;
  const applianceName = APPLIANCE_NAMES[kitchenAppliance];
  const applianceVersion = selectedRecipe
    ? applianceVersions[selectedRecipe] ?? recipe?.applianceVersion
    : undefined;

  async function regenerateSlot(day: string, meal: string) {
    setRegenSlot(`${day}:${meal}`);
    setRegenError("");
    try {
      const res = await fetch(`/api/meal-plan/${plan.id}/meal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, meal }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Přegenerování se nepovedlo.");
      router.refresh();
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : "Něco se pokazilo.");
    } finally {
      setRegenSlot(null);
    }
  }

  async function convertForAppliance() {
    if (!selectedRecipe) return;
    setApplianceLoading(true);
    setApplianceError("");
    try {
      const res = await fetch(`/api/meal-plan/${plan.id}/appliance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeName: selectedRecipe }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Převod se nepovedl.");
      setApplianceVersions((prev) => ({ ...prev, [selectedRecipe]: data }));
    } catch (err) {
      setApplianceError(err instanceof Error ? err.message : "Něco se pokazilo.");
    } finally {
      setApplianceLoading(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "meals", label: "Jídelníček" },
    { key: "shopping", label: `Nákup (${shoppingList.length})` },
    { key: "recipes", label: `Recepty (${Object.keys(recipes).length})` },
  ];

  return (
    <div>
      <div role="tablist" className="flex gap-7 border-b-2 border-gray-900">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSelectedRecipe(null);
            }}
            className={`-mb-0.5 border-b-4 pb-3 text-base font-semibold transition-colors ${
              activeTab === tab.key
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "meals" && (
        <div className="mt-2">
          {regenError && <p className={`${errorBox} mt-4`}>{regenError}</p>}
          {days.map((day) => (
            <div
              key={day}
              className="grid gap-3 border-b border-gray-200 py-6 md:grid-cols-[9rem_1fr] md:gap-8"
            >
              <h3 className="text-2xl">{DAY_LABELS[day] ?? day}</h3>
              <div className="grid gap-5 sm:grid-cols-3">
                {(["breakfast", "lunch", "dinner"] as const).map((meal) => {
                  const name = meals[day]?.[meal];
                  const busy = regenSlot === `${day}:${meal}`;
                  return (
                    <div key={meal} className="min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-500">{MEAL_LABELS[meal]}</span>
                        <button
                          onClick={() => regenerateSlot(day, meal)}
                          disabled={regenSlot !== null}
                          aria-label={`Přegenerovat: ${MEAL_LABELS[meal]}, ${DAY_LABELS[day] ?? day}`}
                          title="Přegenerovat toto jídlo"
                          className="flex h-7 w-7 items-center justify-center border border-gray-300 text-base text-gray-500 hover:border-brand-600 hover:text-brand-600 disabled:opacity-40"
                        >
                          {busy ? "…" : "↻"}
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          if (name && recipes[name]) {
                            setSelectedRecipe(name);
                            setActiveTab("recipes");
                          }
                        }}
                        className="mt-1.5 text-left text-[1.05rem] font-semibold leading-snug text-gray-900 hover:text-brand-600"
                      >
                        {name ?? "–"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "shopping" && (
        <div className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="text-gray-600">
              {shoppingList.length} položek. Naskenujte QR kód v mobilu nebo si seznam uložte.
            </p>
            <ShoppingListQR mealPlanId={plan.id} />
          </div>

          <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
            {categories.map((cat) => {
              const items = shoppingList.filter((i) => i.category === cat);
              const open = !closedCategories[cat];
              return (
                <section key={cat} className="py-5">
                  <button
                    onClick={() => setClosedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }))}
                    aria-expanded={open}
                    className="flex w-full items-baseline justify-between text-left"
                  >
                    <span className="font-display text-xl font-bold">{CATEGORY_LABELS[cat] ?? cat}</span>
                    <span className="text-sm text-gray-500">
                      {items.length} {open ? "skrýt" : "zobrazit"}
                    </span>
                  </button>
                  {open && (
                    <ul className="mt-4 space-y-3">
                      {items.map((item, idx) => (
                        <li key={idx} className="flex items-baseline justify-between gap-4">
                          <span className="flex flex-wrap items-baseline gap-x-2 text-[0.95rem] text-gray-900">
                            {item.name}
                            {item.rohlikUrl && (
                              <a
                                href={item.rohlikUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Zobrazit produkt na Rohlík.cz"
                                aria-label={`Zobrazit ${item.name} na Rohlík.cz`}
                                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-brand-600 text-[10px] font-bold text-brand-600 hover:bg-brand-600 hover:text-white"
                              >
                                i
                              </a>
                            )}
                            {!item.rohlikUrl && (
                              <a
                                href={`https://www.rohlik.cz/hledat?q=${encodeURIComponent(item.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Hledat na Rohlík.cz"
                                aria-label={`Hledat ${item.name} na Rohlík.cz`}
                                className="inline-flex h-4 w-4 items-center justify-center text-gray-400 hover:text-brand-600"
                              >
                                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                                  <circle cx="7" cy="7" r="4.5" />
                                  <path d="M10.5 10.5L14 14" strokeLinecap="round" />
                                </svg>
                              </a>
                            )}
                          </span>
                          <span className="whitespace-nowrap text-sm text-gray-600">
                            {item.amount} {item.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "recipes" && (
        <div className="mt-8">
          {recipe ? (
            <article>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="text-sm font-semibold text-brand-600 underline underline-offset-4"
              >
                Zpět na recepty
              </button>
              <h3 className="mt-6 text-3xl font-extrabold md:text-4xl">{recipe.name}</h3>
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-600">
                <div>
                  <dt className="inline">Čas: </dt>
                  <dd className="inline font-semibold text-gray-900">{recipe.time} min</dd>
                </div>
                <div>
                  <dt className="inline">Porce: </dt>
                  <dd className="inline font-semibold text-gray-900">{recipe.servings}</dd>
                </div>
                <div>
                  <dt className="inline">Energie: </dt>
                  <dd className="inline font-semibold text-gray-900">{recipe.calories} kcal</dd>
                </div>
              </dl>

              {recipe.applianceSuitable && applianceName && (
                <div className="mt-6">
                  {!applianceVersion ? (
                    <button
                      onClick={convertForAppliance}
                      disabled={applianceLoading}
                      className={secondaryButton}
                    >
                      {applianceLoading ? "Převádím…" : `Předělat pro ${applianceName}`}
                    </button>
                  ) : (
                    <div className="border-l-4 border-brand-600 bg-brand-50 p-5">
                      <h4 className="font-display text-xl font-bold">Postup pro {applianceName}</h4>
                      <ol className="mt-4 space-y-3">
                        {applianceVersion.steps.map((step, i) => (
                          <li key={i} className="flex gap-4 text-[0.95rem] leading-relaxed">
                            <span className="font-display font-bold text-brand-600">{i + 1}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {applianceError && <p className={`${errorBox} mt-3`}>{applianceError}</p>}
                </div>
              )}

              <div className="mt-10 grid gap-10 md:grid-cols-[1fr_1.4fr]">
                <div>
                  <h4 className="font-display text-xl font-bold">Ingredience</h4>
                  <ul className="mt-4 divide-y divide-gray-200 border-y border-gray-200">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex justify-between gap-4 py-2.5 text-[0.95rem]">
                        <span>{ing.name}</span>
                        <span className="whitespace-nowrap text-gray-600">{ing.amount}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-display text-xl font-bold">Postup</h4>
                  <ol className="mt-4 space-y-4">
                    {recipe.steps.map((step, i) => (
                      <li key={i} className="flex gap-4 text-[0.95rem] leading-relaxed">
                        <span className="font-display font-bold text-brand-600">{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </article>
          ) : (
            <ul className="divide-y divide-gray-200 border-y border-gray-200">
              {Object.entries(recipes).map(([name, r]) => (
                <li key={name}>
                  <button
                    onClick={() => setSelectedRecipe(name)}
                    className="flex w-full items-baseline justify-between gap-4 py-4 text-left hover:text-brand-600"
                  >
                    <span className="text-lg font-semibold">{r.name}</span>
                    <span className="whitespace-nowrap text-sm text-gray-500">
                      {r.time} min, {r.servings} os.
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
