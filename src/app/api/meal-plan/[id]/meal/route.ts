import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { regenerateMeal, type Recipe, type ShoppingItem } from "@/lib/meal-planner";

export const maxDuration = 60;

const bodySchema = z.object({
  day: z.string().min(1),
  meal: z.enum(["breakfast", "lunch", "dinner"]),
});

type Meals = Record<string, Record<string, string>>;
type Recipes = Record<string, Recipe & { applianceVersion?: { steps: string[] } }>;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const { id } = await params;
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Neplatné jídlo" }, { status: 400 });
  }
  const { day, meal } = body.data;

  const plan = await prisma.mealPlan.findFirst({
    where: { id, userId: session.user.id },
    include: { user: { include: { preferences: true } } },
  });
  if (!plan) {
    return NextResponse.json({ error: "Jídelníček nenalezen" }, { status: 404 });
  }
  if (!plan.user.preferences) {
    return NextResponse.json({ error: "Nejprve nastavte preference" }, { status: 400 });
  }

  const meals = plan.meals as unknown as Meals;
  const recipes = plan.recipes as unknown as Recipes;
  const oldName = meals[day]?.[meal];
  if (!oldName) {
    return NextResponse.json({ error: "Jídlo nenalezeno" }, { status: 404 });
  }

  const avoid = new Set<string>();
  for (const d of Object.values(meals)) for (const m of Object.values(d)) if (m) avoid.add(m);

  let result: { name: string; recipe: Recipe };
  try {
    result = await regenerateMeal(plan.user.preferences, meal, [...avoid]);
  } catch (err) {
    console.error("Meal regeneration error:", err);
    return NextResponse.json({ error: "Přegenerování selhalo. Zkus to znovu." }, { status: 500 });
  }

  const stillUsed = Object.values(meals).some((d) => Object.values(d).includes(oldName));
  const newRecipes = { ...recipes, [result.name]: result.recipe };
  if (!stillUsed && oldName !== result.name) delete newRecipes[oldName];

  const newMeals: Meals = { ...meals, [day]: { ...meals[day], [meal]: result.name } };

  const shoppingList = (plan.shoppingList as unknown as ShoppingItem[]) ?? [];
  const addedItems: ShoppingItem[] = result.recipe.ingredients.map((ing) => ({
    name: ing.name,
    amount: ing.amount,
    unit: "",
    category: "ostatni",
  }));

  await prisma.mealPlan.update({
    where: { id: plan.id },
    data: {
      meals: newMeals as unknown as object,
      recipes: newRecipes as unknown as object,
      shoppingList: [...shoppingList, ...addedItems] as unknown as object[],
    },
  });

  return NextResponse.json({ ok: true, name: result.name });
}
