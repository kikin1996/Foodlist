import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateMealPlan } from "@/lib/meal-planner";
import { fetchRohlikCatalog } from "@/lib/rohlik-catalog";
import { decrypt } from "@/lib/encryption";

export const maxDuration = 120;

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
    // Stáhni dostupné produkty z Rohlíku (pokud má uživatel propojený účet)
    let catalog = undefined;
    if (user.rohlikEmail && user.rohlikPassEnc) {
      try {
        console.log("Stahuji katalog z Rohlíku...");
        const rohlikPassword = decrypt(user.rohlikPassEnc);
        catalog = await fetchRohlikCatalog(user.rohlikEmail, rohlikPassword);
        console.log(`Katalog stažen: ${catalog.length} produktů`);
      } catch (e) {
        console.warn("Katalog se nepodařilo stáhnout, generuji bez něj:", e);
      }
    }

    // Načti předchozí jídelníčky aby se neopakovaly
    const previousPlans = await prisma.mealPlan.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { meals: true },
    });

    const previousMeals: string[] = [];
    for (const plan of previousPlans) {
      const meals = plan.meals as Record<string, Record<string, string>>;
      for (const day of Object.values(meals)) {
        for (const meal of Object.values(day)) {
          if (meal && typeof meal === "string") previousMeals.push(meal);
        }
      }
    }

    // Generuj jídelníček na základě katalogu, preferencí a předchozích jídel
    const weekPlan = await generateMealPlan(user.preferences, catalog, previousMeals);

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
