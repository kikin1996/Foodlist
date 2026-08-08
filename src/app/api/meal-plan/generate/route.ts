import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateMealPlan } from "@/lib/meal-planner";
import { fetchRohlikCatalog, isCatalogFresh, type CatalogProduct } from "@/lib/rohlik-catalog";
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
    // ── Katalog z Rohlíku (s cache v DB) ──
    let catalog: CatalogProduct[] | undefined;

    if (user.rohlikEmail && user.rohlikPassEnc) {
      const prefs = user.preferences;

      const cached = (prefs.rohlikCatalog as unknown as CatalogProduct[]) ?? [];

      if (isCatalogFresh(prefs.catalogUpdatedAt ?? null) && cached.length > 0) {
        // Použij cached katalog z DB
        catalog = cached;
        console.log(`Používám cached katalog: ${catalog.length} produktů`);
      } else {
        // Stáhni nový katalog a ulož do DB (prázdný výsledek necachujeme)
        try {
          console.log("Stahuji čerstvý katalog z Rohlíku...");
          const rohlikPassword = decrypt(user.rohlikPassEnc);
          catalog = await fetchRohlikCatalog(user.rohlikEmail, rohlikPassword);
          console.log(`Katalog stažen: ${catalog.length} produktů`);

          if (catalog.length > 0) {
            await prisma.userPreferences.update({
              where: { userId: session.user.id },
              data: {
                rohlikCatalog: catalog as unknown as object[],
                catalogUpdatedAt: new Date(),
              },
            });
          } else {
            catalog = cached.length > 0 ? cached : undefined;
          }
        } catch (e) {
          console.warn("Katalog se nepodařilo stáhnout:", e);
        }
      }
    }

    // ── Předchozí jídelníčky (zakázaná jídla) ──
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

    // ── Generuj jídelníček ──
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

    return NextResponse.json({
      id: plan.id,
      catalogSize: catalog?.length ?? 0,
    });
  } catch (err) {
    console.error("Meal plan generation error:", err);
    return NextResponse.json(
      { error: "Generování jídelníčku selhalo. Zkuste to znovu." },
      { status: 500 }
    );
  }
}
