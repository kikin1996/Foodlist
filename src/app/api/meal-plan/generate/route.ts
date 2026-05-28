import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateMealPlan } from "@/lib/meal-planner";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { preferences: true },
  });

  if (!user?.preferences) {
    return NextResponse.json({ error: "Nejprve nastavte preference" }, { status: 400 });
  }

  try {
    const weekPlan = await generateMealPlan(user.preferences);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const plan = await prisma.mealPlan.create({
      data: {
        userId: session.user.id,
        weekStart,
        meals: weekPlan.meals as object,
        recipes: weekPlan.recipes as object,
        shoppingList: weekPlan.shoppingList as unknown as object[],
        status: "DRAFT",
      },
    });

    return NextResponse.json({ id: plan.id });
  } catch (err) {
    console.error("Meal plan generation error:", err);
    return NextResponse.json(
      { error: "Generování jídelníčku selhalo. Zkuste to znovu." },
      { status: 500 }
    );
  }
}
