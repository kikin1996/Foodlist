import Anthropic from "@anthropic-ai/sdk";
import type { UserPreferences } from "@prisma/client";

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

function buildSystemPrompt(prefs: UserPreferences): string {
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
- Ingredience musí být dostupné na Rohlík.cz
- Respektuj rozpočet (${prefs.weeklyBudget} Kč na ${prefs.householdSize} osob)
- Jídla musí být rozmanitá, žádné opakování
- České názvy ingrediencí
- Nákupní seznam musí být přesný s množstvím

Odpovídej POUZE validním JSON, žádný jiný text.`;
}

export async function generateMealPlan(prefs: UserPreferences): Promise<WeeklyMealPlan> {
  const days = ["pondeli", "utery", "streda", "ctvrtek", "patek", "sobota", "nedele"];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    system: buildSystemPrompt(prefs),
    messages: [
      {
        role: "user",
        content: `Vytvoř kompletní týdenní jídelníček pro dny: ${days.join(", ")}.

Vrať JSON v přesně tomto formátu:
{
  "meals": {
    "pondeli": { "breakfast": "název", "lunch": "název", "dinner": "název" },
    ... pro každý den
  },
  "recipes": {
    "název receptu": {
      "name": "název",
      "time": 30,
      "servings": ${prefs.householdSize},
      "ingredients": [{ "name": "ingredience", "amount": "200g" }],
      "steps": ["krok 1", "krok 2"],
      "calories": 450
    }
  },
  "shoppingList": [
    { "name": "název", "amount": "500", "unit": "g", "category": "zelenina" }
  ]
}

Kategorie pro shoppingList: zelenina, ovoce, maso, mlecne, pecivo, suche, ostatni`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON in response");

  return JSON.parse(jsonMatch[0]) as WeeklyMealPlan;
}
