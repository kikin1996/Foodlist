import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  await prisma.mealPlan.deleteMany({ where: { userId: session.user.id } });

  return NextResponse.json({ ok: true });
}
