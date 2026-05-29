import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { z } from "zod";

const schema = z.object({
  healthLevel: z.number().int().min(1).max(10),
  tastyLevel: z.number().int().min(1).max(10),
  householdSize: z.number().int().min(1).max(20),
  weeklyBudget: z.number().min(100).max(100000),
  deliveryDay: z.string(),
  deliveryTime: z.string(),
  isVegetarian: z.boolean(),
  isVegan: z.boolean(),
  isGlutenFree: z.boolean(),
  isLactoseFree: z.boolean(),
  allergies: z.string().optional(),
  cuisinePreferences: z.string().optional(),
  dislikedIngredients: z.string().optional(),
  includedMeals: z.string().optional(),
  includedDays: z.string().optional(),
  rohlikEmail: z.string().optional(),
  rohlikPassword: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const { rohlikEmail, rohlikPassword, ...prefsData } = data;

    await prisma.$transaction(async (tx) => {
      await tx.userPreferences.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, ...prefsData },
        update: prefsData,
      });

      if (rohlikEmail && rohlikPassword) {
        await tx.user.update({
          where: { id: session.user.id },
          data: {
            rohlikEmail,
            rohlikPassEnc: encrypt(rohlikPassword),
          },
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Neplatná data" }, { status: 400 });
    }
    console.error("Preferences error:", err);
    return NextResponse.json({ error: "Interní chyba" }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(prefs);
}
