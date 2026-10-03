import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import RefreshCatalogButton from "@/components/RefreshCatalogButton";
import AppHeader from "@/components/AppHeader";
import type { CatalogProduct } from "@/lib/rohlik-catalog";

const CAT_LABELS: Record<string, string> = {
  maso: "Maso a ryby",
  mlecne: "Mléčné a vejce",
  zelenina: "Zelenina",
  ovoce: "Ovoce",
  pecivo: "Pečivo",
  suche: "Suché potraviny",
  ostatni: "Konzervy a oleje",
};

const CAT_ORDER = ["zelenina", "ovoce", "maso", "mlecne", "pecivo", "suche", "ostatni"];

export default async function CatalogPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
    select: { rohlikCatalog: true, catalogUpdatedAt: true },
  });

  const catalog = (prefs?.rohlikCatalog as unknown as CatalogProduct[]) ?? [];
  const updatedAt = prefs?.catalogUpdatedAt;

  const byCat: Record<string, CatalogProduct[]> = {};
  for (const p of catalog) {
    (byCat[p.category] ??= []).push(p);
  }

  return (
    <div className="min-h-screen">
      <AppHeader current="/catalog" />

      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold">Katalog</h1>
            <p className="mt-2 text-gray-600">
              {catalog.length > 0
                ? `${catalog.length} produktů skladem. Aktualizováno ${
                    updatedAt
                      ? new Date(updatedAt).toLocaleString("cs-CZ", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
                      : "nikdy"
                  }.`
                : "Katalog zatím nebyl stažen."}
            </p>
          </div>
          <RefreshCatalogButton />
        </div>

        {catalog.length === 0 ? (
          <p className="mt-10 max-w-md leading-relaxed text-gray-600">
            Katalog se stáhne z Rohlík.cz a použije se při sestavování jídelníčku. Stačí kliknout na
            Aktualizovat katalog. Potřebujete k tomu uložený účet v Nastavení.
          </p>
        ) : (
          <div className="mt-10 grid gap-x-10 md:grid-cols-2">
            {CAT_ORDER.map((cat) => {
              const items = byCat[cat] ?? [];
              if (items.length === 0) return null;
              return (
                <section key={cat} className="border-t-2 border-gray-900 py-5">
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-display text-xl font-bold">{CAT_LABELS[cat] ?? cat}</h2>
                    <span className="text-sm text-gray-500">{items.length}</span>
                  </div>
                  <ul className="mt-4 divide-y divide-gray-200">
                    {items.map((p) => (
                      <li key={p.id} className="flex items-baseline justify-between gap-4 py-2.5 text-[0.95rem]">
                        <span>{p.name}</span>
                        <span className="whitespace-nowrap text-sm text-gray-600">
                          {p.amount}, {Math.round(p.price)} Kč
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
