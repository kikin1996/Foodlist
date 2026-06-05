import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchRohlikCatalog, type CatalogProduct } from "@/lib/rohlik-catalog";
import { decrypt } from "@/lib/encryption";

export const maxDuration = 120;

// GET — vrátí cached katalog
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const prefs = await prisma.userPreferences.findUnique({ where: { userId: session.user.id } });
  const catalog = (prefs?.rohlikCatalog as unknown as CatalogProduct[]) ?? [];

  return NextResponse.json({
    catalog,
    updatedAt: prefs?.catalogUpdatedAt ?? null,
    count: catalog.length,
  });
}

// POST — vynutí refresh katalogu
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { preferences: true },
  });

  if (!user?.rohlikEmail || !user?.rohlikPassEnc) {
    return NextResponse.json({ error: "Nejprve nastavte Rohlík přihlašovací údaje" }, { status: 400 });
  }

  try {
    const rohlikPassword = decrypt(user.rohlikPassEnc);
    const catalog = await fetchRohlikCatalog(user.rohlikEmail, rohlikPassword);

    await prisma.userPreferences.update({
      where: { userId: session.user.id },
      data: {
        rohlikCatalog: catalog as unknown as object[],
        catalogUpdatedAt: new Date(),
      },
    });

    return NextResponse.json({ count: catalog.length, updatedAt: new Date() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
