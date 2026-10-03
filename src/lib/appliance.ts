import OpenAI from "openai";
import type { Recipe } from "./meal-planner";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const APPLIANCE_LABELS: Record<string, string> = {
  thermomix: "Thermomix",
  monsieur_cuisine: "Monsieur Cuisine",
};

export interface ApplianceVersion {
  steps: string[];
}

export async function convertRecipeForAppliance(
  recipe: Recipe,
  applianceKey: string,
  model: string
): Promise<ApplianceVersion> {
  const label = APPLIANCE_LABELS[applianceKey];
  if (!label) throw new Error("Neznámý kuchyňský robot");

  const response = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Jsi zkušený kuchař, který přepisuje klasické recepty na postup pro ${label}. Odpovídej POUZE validním JSON.`,
      },
      {
        role: "user",
        content: `Přepiš tento recept na postup pro ${label}. U každého kroku uveď konkrétní nastavení robota (čas, teplotu, rychlost/režim) tam, kde je to relevantní. Zachovej stejné ingredience a porce.

Název: ${recipe.name}
Porce: ${recipe.servings}
Ingredience: ${recipe.ingredients.map((i) => `${i.name} ${i.amount}`).join(", ")}
Původní postup:
${recipe.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Vrať JSON: { "steps": ["krok 1", "krok 2", ...] }`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Prázdná odpověď z AI");
  const parsed = JSON.parse(text) as ApplianceVersion;
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error("AI nevrátila kroky");
  }
  return { steps: parsed.steps };
}
