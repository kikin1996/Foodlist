import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { convertRecipeForAppliance } from "@/lib/appliance";
import { resolveModel, type Recipe } from "@/lib/meal-planner";

export const maxDuration = 60;

const bodySchema = z.object({ recipeName: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const { id } = await params;
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Chybí název receptu" }, { status: 400 });
  }

  const plan = await prisma.mealPlan.findFirst({
    where: { id, userId: session.user.id },
    include: { user: { include: { preferences: true } } },
  });
  if (!plan) {
    return NextResponse.json({ error: "Jídelníček nenalezen" }, { status: 404 });
  }

  const prefs = plan.user.preferences;
  if (!prefs || prefs.kitchenAppliance === "none") {
    return NextResponse.json({ error: "Nemáš nastavený kuchyňský robot" }, { status: 400 });
  }

  const recipes = plan.recipes as unknown as Record<string, Recipe & { applianceVersion?: { steps: string[] } }>;
  const recipe = recipes[body.data.recipeName];
  if (!recipe) {
    return NextResponse.json({ error: "Recept nenalezen" }, { status: 404 });
  }
  if (!recipe.applianceSuitable) {
    return NextResponse.json({ error: "Tento recept se pro robot nehodí" }, { status: 400 });
  }

  if (!recipe.applianceVersion) {
    try {
      recipe.applianceVersion = await convertRecipeForAppliance(
        recipe,
        prefs.kitchenAppliance,
        resolveModel(prefs.aiModel)
      );
    } catch (err) {
      console.error("Appliance conversion error:", err);
      return NextResponse.json({ error: "Převod receptu selhal. Zkus to znovu." }, { status: 500 });
    }

    await prisma.mealPlan.update({
      where: { id: plan.id },
      data: { recipes: recipes as unknown as object },
    });
  }

  return NextResponse.json(recipe.applianceVersion);
}
