import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import RefreshCatalogButton from "@/components/RefreshCatalogButton";
import type { CatalogProduct } from "@/lib/rohlik-catalog";

const CAT_LABELS: Record<string, string> = {
  maso: "🥩 Maso & ryby",
  mlecne: "🥛 Mléčné & vejce",
  zelenina: "🥬 Zelenina",
  ovoce: "🍎 Ovoce",
  pecivo: "🍞 Pečivo",
  suche: "🫘 Suché potraviny",
  ostatni: "🫙 Konzervy & oleje",
};

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

  const catOrder = ["zelenina", "ovoce", "maso", "mlecne", "pecivo", "suche", "ostatni"];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-bold text-gray-900">Kostki</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            ← Zpět na dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dostupné potraviny z Rohlík.cz</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {catalog.length > 0
                ? `${catalog.length} produktů · aktualizováno ${updatedAt ? new Date(updatedAt).toLocaleDateString("cs", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "nikdy"}`
                : "Katalog zatím nebyl stažen"}
            </p>
          </div>
          <RefreshCatalogButton />
        </div>

        {catalog.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-4">🛒</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Katalog není stažen</h2>
            <p className="text-gray-500 text-sm mb-4">
              Klikněte na tlačítko "Aktualizovat katalog" výše. Katalog se stáhne z Rohlík.cz
              a použije se při generování jídelníčku.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {catOrder.map((cat) => {
              const items = byCat[cat] ?? [];
              if (items.length === 0) return null;
              return (
                <div key={cat} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-semibold text-gray-800">{CAT_LABELS[cat] ?? cat}</span>
                    <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                      {items.length} produktů
                    </span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {items.map((p) => (
                      <div key={p.id} className="px-5 py-2.5 flex items-center justify-between">
                        <span className="text-sm text-gray-700">{p.name}</span>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{p.amount}</span>
                          <span className="font-medium text-gray-600">{Math.round(p.price)} Kč</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
