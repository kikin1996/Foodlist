import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { fillRohlikCart } from "@/lib/rohlik";
import type { ShoppingItem } from "@/lib/meal-planner";

export const maxDuration = 300; // Vercel Pro: 5 minut timeout

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const { mealPlanId } = await req.json();
  if (!mealPlanId) {
    return NextResponse.json({ error: "Chybí mealPlanId" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { preferences: true },
  });

  if (!user?.rohlikEmail || !user?.rohlikPassEnc) {
    return NextResponse.json(
      { error: "Nejprve nastavte Rohlík přihlašovací údaje v Nastavení" },
      { status: 400 }
    );
  }

  const plan = await prisma.mealPlan.findFirst({
    where: { id: mealPlanId, userId: session.user.id },
  });

  if (!plan) {
    return NextResponse.json({ error: "Jídelníček nenalezen" }, { status: 404 });
  }

  try {
    const rohlikPassword = decrypt(user.rohlikPassEnc);
    const shoppingList = plan.shoppingList as unknown as ShoppingItem[];

    const result = await fillRohlikCart(
      shoppingList,
      user.rohlikEmail,
      rohlikPassword,
      user.preferences?.householdSize ?? 2
    );

    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        mealPlanId: plan.id,
        rohlikCartItems: result.addedItems,
        rohlikOrderUrl: "https://www.rohlik.cz",
        estimatedTotal: result.estimatedTotal,
        status: "CART_FILLED",
      },
    });

    await prisma.mealPlan.update({
      where: { id: plan.id },
      data: { status: "ORDERED" },
    });

    return NextResponse.json({
      orderId: order.id,
      estimatedTotal: result.estimatedTotal,
      addedItems: result.addedItems.length,
      notFoundItems: result.notFoundItems,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Rohlik order error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
