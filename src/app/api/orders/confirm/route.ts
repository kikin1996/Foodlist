import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const body = await req.formData();
  const orderId = body.get("orderId") as string;

  if (!orderId) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  await prisma.order.updateMany({
    where: { id: orderId, userId: session.user.id },
    data: { status: "CONFIRMED_BY_USER" },
  });

  return NextResponse.redirect(new URL("/dashboard", req.url));
}
