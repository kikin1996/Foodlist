import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const { id } = await params;
  const plan = await prisma.mealPlan.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!plan) {
    return NextResponse.json({ error: "Jídelníček nenalezen" }, { status: 404 });
  }

  const listUrl = `${req.nextUrl.origin}/list/${plan.id}`;
  const png = await QRCode.toBuffer(listUrl, { width: 400, margin: 2 });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
