import OpenAI from "openai";
import type { UserPreferences } from "@prisma/client";
import type { CatalogProduct } from "./rohlik-catalog";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Mapování starých Claude modelů na OpenAI ekvivalenty (pro existující uživatele)
const MODEL_MAP: Record<string, string> = {
  "claude-haiku-4-5-20251001": "gpt-5-mini",
  "claude-sonnet-4-6": "gpt-5.1",
  "claude-opus-4-8": "gpt-5.1",
};

export function resolveModel(aiModel?: string | null): string {
  if (!aiModel) return "gpt-5-mini";
  return MODEL_MAP[aiModel] ?? aiModel;
}

export interface ShoppingItem {
  name: string;
  amount: string;
  unit: string;
  category: "zelenina" | "ovoce" | "maso" | "mlecne" | "pecivo" | "suche" | "ostatni";
  // Rohlík ID vybrané už při generování jídelníčku (z předem staženého katalogu) —
  // umožňuje přidat položku do košíku bez dalšího živého vyhledávání na Rohlíku.
  rohlikId?: number | null;
  rohlikName?: string;
  rohlikPrice?: number;
}

export interface Recipe {
  name: string;
  time: number; // minutes
  servings: number;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  calories: number;
}

export interface DayMeals {
  breakfast: string;
  lunch: string;
  dinner: string;
}

export interface WeeklyMealPlan {
  meals: Record<string, DayMeals>;
  recipes: Record<string, Recipe>;
  shoppingList: ShoppingItem[];
}

function buildSystemPrompt(prefs: UserPreferences, catalog?: CatalogProduct[], previousMeals?: string[]): string {
  const diets: string[] = [];
  if (prefs.isVegetarian) diets.push("vegetariánská");
  if (prefs.isVegan) diets.push("veganská");
  if (prefs.isGlutenFree) diets.push("bezlepková");
  if (prefs.isLactoseFree) diets.push("bez laktózy");

  const cuisines = prefs.cuisinePreferences
    ? `Oblíbené kuchyně: ${prefs.cuisinePreferences}.`
    : "";
  const dislikes = prefs.dislikedIngredients
    ? `Neoblíbené ingredience: ${prefs.dislikedIngredients}.`
    : "";
  const allergies = prefs.allergies
    ? `Alergie: ${prefs.allergies}.`
    : "";

  return `Jsi odborný nutričník a šéfkuchař specializující se na českou domácí kuchyni.
Tvým úkolem je sestavit týdenní jídelníček pro domácnost.

PARAMETRY:
- Zdravost: ${prefs.healthLevel}/10 (10 = maximálně zdravé, 1 = comfort food)
- Chutnost: ${prefs.tastyLevel}/10
- Počet osob: ${prefs.householdSize}
- Týdenní rozpočet: ${prefs.weeklyBudget} Kč
- Dieta: ${diets.length > 0 ? diets.join(", ") : "žádná omezení"}
${cuisines}
${dislikes}
${allergies}

PRAVIDLA:
- Recept musí být realistický pro vaření doma
- Respektuj rozpočet (${prefs.weeklyBudget} Kč na ${prefs.householdSize} osob)
- Jídla musí být MAXIMÁLNĚ ROZMANITÁ — každé jídlo musí být zcela jiné (jiný typ masa, jiná příloha, jiný způsob přípravy)
- České názvy ingrediencí
- Nákupní seznam musí být přesný s množstvím
${catalog && catalog.length > 0 ? `- PŘEDNOSTNĚ používej tyto reálně dostupné produkty z Rohlík.cz (u každého je #ID):
${catalog.map((p) => `  #${p.id} ${p.name} (${p.amount}, ${p.price}Kč)`).join("\n")}
- U každé položky nákupního seznamu, která odpovídá produktu z tohoto seznamu, VYPLŇ jeho rohlikId, rohlikName a rohlikPrice přesně podle seznamu výše. Pouze pokud pro položku v seznamu opravdu není žádný vhodný produkt, nastav rohlikId na null.` : "- Ingredience musí být dostupné na Rohlík.cz"}

${previousMeals && previousMeals.length > 0 ? `
⛔ PŘÍSNÝ ZÁKAZ — TATO JÍDLA NESMÍŠ NIKDY POUŽÍT (jsou z předchozích jídelníčků):
${[...new Set(previousMeals)].slice(0, 40).map((m) => `  ❌ ${m}`).join("\n")}
Pokud by ses chystal použít tato jídla nebo jejich velmi podobnou variantu, VYMYSLI NĚCO ZCELA JINÉHO.` : ""}

Odpovídej POUZE validním JSON, žádný jiný text.`;
}

export async function generateMealPlan(prefs: UserPreferences, catalog?: CatalogProduct[], previousMeals?: string[]): Promise<WeeklyMealPlan> {
  const allDays = ["pondeli", "utery", "streda", "ctvrtek", "patek", "sobota", "nedele"];
  const days = prefs.includedDays
    ? prefs.includedDays.split(",").filter((d) => allDays.includes(d))
    : allDays;
  const meals = prefs.includedMeals
    ? prefs.includedMeals.split(",").filter(Boolean)
    : ["breakfast", "lunch", "dinner"];

  const response = await client.chat.completions.create({
    model: resolveModel(prefs.aiModel),
    max_completion_tokens: 12000,
    reasoning_effort: "low",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSystemPrompt(prefs, catalog, previousMeals) },
      {
        role: "user",
        content: `Vytvoř ZCELA NOVÝ a ORIGINÁLNÍ jídelníček pro dny: ${days.join(", ")}.
Plánuj pouze tyto chody: ${meals.join(", ")}.

NÁHODNÝ SEED: ${Date.now()} — použij k vygenerování NAPROSTO ODLIŠNÝCH jídel než kdy dřív.
Mysli kreativně — zkus různé světové kuchyně, různé způsoby přípravy, různé proteiny.

DŮLEŽITÉ: Buď stručný! Maximálně 3 kroky na recept, max 6 ingrediencí na recept.

Vrať POUZE validní JSON (žádný text před ani po):
{
  "meals": {
${days.map((d) => `    "${d}": { ${meals.map((m) => `"${m}": "název"`).join(", ")} }`).join(",\n")}
  },
  "recipes": {
    "přesný název z meals": {
      "name": "název",
      "time": 20,
      "servings": ${prefs.householdSize},
      "ingredients": [{ "name": "ingredience", "amount": "200g" }],
      "steps": ["Krok 1.", "Krok 2.", "Krok 3."],
      "calories": 400
    }
  },
  "shoppingList": [
    { "name": "název", "amount": "500", "unit": "g", "category": "zelenina", "rohlikId": 123456, "rohlikName": "přesný název z katalogu", "rohlikPrice": 45.9 }
  ]
}

Kategorie: zelenina, ovoce, maso, mlecne, pecivo, suche, ostatni
rohlikId/rohlikName/rohlikPrice: podle katalogu výše (viz systémová instrukce), jinak rohlikId: null a rohlikName/rohlikPrice vynech.
Recepty pouze pro unikátní jídla (nesnídaně jako ovesná kaše nemusí mít recept).`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenAI");

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");

  return JSON.parse(jsonMatch[0]) as WeeklyMealPlan;
}
