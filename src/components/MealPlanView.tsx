"use client";

import { useState } from "react";
import OrderButton from "./OrderButton";

const DAY_LABELS: Record<string, string> = {
  pondeli: "Pondělí",
  utery: "Úterý",
  streda: "Středa",
  ctvrtek: "Čtvrtek",
  patek: "Pátek",
  sobota: "Sobota",
  nedele: "Neděle",
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Snídaně",
  lunch: "Oběd",
  dinner: "Večeře",
};

const MEAL_ICONS: Record<string, string> = {
  breakfast: "☕",
  lunch: "🍽️",
  dinner: "🌙",
};

interface MealPlanViewProps {
  plan: {
    id: string;
    meals: unknown;
    recipes: unknown;
    shoppingList: unknown;
    status: string;
    orders: { id: string; status: string; rohlikOrderUrl?: string | null; estimatedTotal?: number | null }[];
  };
}

export default function MealPlanView({ plan }: MealPlanViewProps) {
  const [activeTab, setActiveTab] = useState<"meals" | "shopping" | "recipes">("meals");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  function toggleCategory(cat: string) {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);

  const meals = plan.meals as Record<string, Record<string, string>>;
  const recipes = plan.recipes as Record<string, {
    name: string; time: number; servings: number;
    ingredients: { name: string; amount: string }[];
    steps: string[]; calories: number;
  }>;
  const shoppingList = plan.shoppingList as {
    name: string; amount: string; unit: string; category: string;
  }[];

  const days = Object.keys(meals);

  const categories = Array.from(new Set(shoppingList.map((i) => i.category)));

  const categoryLabels: Record<string, string> = {
    zelenina: "Zelenina",
    ovoce: "Ovoce",
    maso: "Maso & ryby",
    mlecne: "Mléčné výrobky",
    pecivo: "Pečivo",
    suche: "Suchá trvanlivá",
    ostatni: "Ostatní",
  };

  const categoryIcons: Record<string, string> = {
    zelenina: "🥬", ovoce: "🍎", maso: "🥩", mlecne: "🥛", pecivo: "🍞", suche: "🫘", ostatni: "🛍️",
  };

  const recipe = selectedRecipe ? recipes[selectedRecipe] : null;
  const order = plan.orders[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {(["meals", "shopping", "recipes"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "text-brand-700 border-b-2 border-brand-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "meals" ? "📅 Jídelníček" : tab === "shopping" ? "🛒 Nákupní seznam" : "📖 Recepty"}
          </button>
        ))}
      </div>

      {/* Meals tab */}
      {activeTab === "meals" && (
        <div className="divide-y divide-gray-50">
          {days.map((day) => (
            <div key={day} className="p-5">
              <div className="font-semibold text-gray-900 mb-3">
                {DAY_LABELS[day] ?? day}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
                  <div key={meal} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-400 mb-1">
                      {MEAL_ICONS[meal]} {MEAL_LABELS[meal]}
                    </div>
                    <button
                      onClick={() => {
                        if (meals[day]?.[meal] && recipes[meals[day][meal]]) {
                          setSelectedRecipe(meals[day][meal]);
                          setActiveTab("recipes");
                        }
                      }}
                      className="text-sm text-gray-800 font-medium text-left hover:text-brand-600 transition-colors"
                    >
                      {meals[day]?.[meal] ?? "–"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shopping tab */}
      {activeTab === "shopping" && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900">Nákupní seznam</h3>
              <p className="text-sm text-gray-500">{shoppingList.length} položek</p>
            </div>
            {plan.status !== "ORDERED" && (
              <OrderButton mealPlanId={plan.id} />
            )}
            {order?.status === "CART_FILLED" && order.estimatedTotal && (
              <div className="text-sm text-gray-500">
                Odhadovaná cena: <strong>{order.estimatedTotal.toLocaleString("cs")} Kč</strong>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {categories.map((cat) => {
              const items = shoppingList.filter((i) => i.category === cat);
              const isOpen = !!openCategories[cat];
              return (
                <div key={cat} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{categoryIcons[cat]}</span>
                      <span className="font-medium text-gray-800 text-sm">
                        {categoryLabels[cat] ?? cat}
                      </span>
                      <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                        {items.length}
                      </span>
                    </div>
                    <span className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                      ▾
                    </span>
                  </button>
                  {isOpen && (
                    <div className="divide-y divide-gray-50">
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-4 py-2.5"
                        >
                          <span className="text-sm text-gray-700">{item.name}</span>
                          <span className="text-sm text-gray-500 font-medium">
                            {item.amount} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recipes tab */}
      {activeTab === "recipes" && (
        <div className="p-6">
          {recipe ? (
            <div>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="text-sm text-brand-600 hover:underline mb-4 flex items-center gap-1"
              >
                ← Zpět na recepty
              </button>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{recipe.name}</h3>
              <div className="flex gap-4 text-sm text-gray-500 mb-6">
                <span>⏱️ {recipe.time} min</span>
                <span>👥 {recipe.servings} osob</span>
                <span>🔥 ~{recipe.calories} kcal/porce</span>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Ingredience</h4>
                  <ul className="space-y-2">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                        <span>{ing.name}</span>
                        <span className="text-gray-400 ml-auto">{ing.amount}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Postup</h4>
                  <ol className="space-y-3">
                    {recipe.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-gray-700">
                        <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Všechny recepty</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(recipes).map(([name, r]) => (
                  <button
                    key={name}
                    onClick={() => setSelectedRecipe(name)}
                    className="text-left p-4 bg-gray-50 hover:bg-brand-50 border border-gray-100 hover:border-brand-200 rounded-xl transition-colors"
                  >
                    <div className="font-medium text-gray-900 text-sm mb-1">{r.name}</div>
                    <div className="text-xs text-gray-400">
                      ⏱️ {r.time} min · 👥 {r.servings} os. · 🔥 {r.calories} kcal
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
