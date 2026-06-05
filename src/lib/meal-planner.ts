import Anthropic from "@anthropic-ai/sdk";
import type { UserPreferences } from "@prisma/client";
import type { CatalogProduct } from "./rohlik-catalog";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ShoppingItem {
  name: string;
  amount: string;
  unit: string;
  category: "zelenina" | "ovoce" | "maso" | "mlecne" | "pecivo" | "suche" | "ostatni";
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

function buildSystemPrompt(prefs: UserPreferences, catalog?: CatalogProduct[]): string {
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
- Jídla musí být rozmanitá, žádné opakování
- České názvy ingrediencí
- Nákupní seznam musí být přesný s množstvím
${catalog && catalog.length > 0 ? `- POUŽÍVEJ POUZE ingredience z tohoto seznamu dostupných produktů na Rohlík.cz:
${catalog.map((p) => `  ${p.name} (${p.amount}, ${p.price}Kč)`).join("\n")}` : "- Ingredience musí být dostupné na Rohlík.cz"}

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

  const response = await client.messages.create({
    model: (prefs.aiModel ?? "claude-haiku-4-5-20251001") as string,
    max_tokens: 8000,
    system: buildSystemPrompt(prefs, catalog),
    messages: [
      {
        role: "user",
        content: `Vytvoř jídelníček pro dny: ${days.join(", ")}.
Plánuj pouze tyto chody: ${meals.join(", ")}.

NÁHODNOST: Dnešní seed: ${Date.now()}. Buď kreativní a vygeneruj ZCELA ODLIŠNÁ jídla od minulých.
${previousMeals && previousMeals.length > 0
  ? `ZAKÁZANÁ JÍDLA (tato jídla NESMÍ být v jídelníčku, použij jiné):
${[...new Set(previousMeals)].slice(0, 30).map((m) => `- ${m}`).join("\n")}`
  : ""}

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
    { "name": "název", "amount": "500", "unit": "g", "category": "zelenina" }
  ]
}

Kategorie: zelenina, ovoce, maso, mlecne, pecivo, suche, ostatni
Recepty pouze pro unikátní jídla (nesnídaně jako ovesná kaše nemusí mít recept).`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");

  return JSON.parse(jsonMatch[0]) as WeeklyMealPlan;
}
