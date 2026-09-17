import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

interface ShoppingItem {
  name: string;
  amount: string;
  unit: string;
  category: string;
  rohlikName?: string;
  rohlikPrice?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  zelenina: "Zelenina",
  ovoce: "Ovoce",
  maso: "Maso & ryby",
  mlecne: "Mléčné výrobky",
  pecivo: "Pečivo",
  suche: "Suchá trvanlivá",
  napoje: "Nápoje",
  ostatni: "Ostatní",
};

const CATEGORY_ICONS: Record<string, string> = {
  zelenina: "🥬", ovoce: "🍎", maso: "🥩", mlecne: "🥛",
  pecivo: "🍞", suche: "🫘", napoje: "🥤", ostatni: "🛍️",
};

const CATEGORY_ORDER = ["zelenina", "ovoce", "maso", "mlecne", "pecivo", "suche", "napoje", "ostatni"];

export default async function ShoppingListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await prisma.mealPlan.findUnique({
    where: { id },
    select: { shoppingList: true, weekStart: true },
  });
  if (!plan) notFound();

  const items = (plan.shoppingList as unknown as ShoppingItem[]) ?? [];
  const categories = CATEGORY_ORDER.filter((c) => items.some((i) => i.category === c));
  const total = items.reduce((s, i) => s + (i.rohlikPrice ?? 0), 0);
  const priced = items.filter((i) => i.rohlikPrice != null).length;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="text-3xl mb-1">🛒</div>
          <h1 className="text-xl font-bold text-gray-900">Nákupní seznam</h1>
          <p className="text-sm text-gray-500">{items.length} položek</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
          {categories.map((cat) => {
            const catItems = items.filter((i) => i.category === cat);
            return (
              <div key={cat} className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{CATEGORY_ICONS[cat] ?? "🛍️"}</span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </span>
                </div>
                <ul className="space-y-2">
                  {catItems.map((item, idx) => (
                    <li key={idx} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-gray-800">
                        {item.rohlikName ?? item.name}
                        <span className="text-gray-400"> — {item.amount}{item.unit}</span>
                      </span>
                      {item.rohlikPrice != null && (
                        <span className="text-gray-500 font-medium whitespace-nowrap">
                          {Math.round(item.rohlikPrice)} Kč
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {priced > 0 && (
          <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Odhadovaná cena ({priced}/{items.length} položek)
            </span>
            <span className="font-bold text-gray-900">{Math.round(total).toLocaleString("cs")} Kč</span>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Ceny jsou orientační (Rohlík.cz), mohou se lišit v jiných obchodech.
        </p>
      </div>
    </div>
  );
}
