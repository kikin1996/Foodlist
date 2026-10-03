import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

interface ShoppingItem {
  name: string;
  amount: string;
  unit: string;
  category: string;
  rohlikName?: string;
  rohlikPrice?: number;
  rohlikUrl?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  zelenina: "Zelenina a ovoce",
  ovoce: "Ovoce",
  maso: "Maso a ryby",
  mlecne: "Mléčné",
  pecivo: "Pečivo",
  suche: "Suché potraviny",
  napoje: "Nápoje",
  ostatni: "Ostatní",
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
    <div className="min-h-screen bg-white px-5 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="text-4xl font-extrabold">Nákup</h1>
        <p className="mt-2 text-gray-600">
          Týden od {plan.weekStart.toLocaleDateString("cs-CZ")}, {items.length} položek
        </p>

        <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
          {categories.map((cat) => (
            <section key={cat} className="py-5">
              <h2 className="font-display text-xl font-bold">{CATEGORY_LABELS[cat] ?? cat}</h2>
              <ul className="mt-4 space-y-3">
                {items
                  .filter((i) => i.category === cat)
                  .map((item, idx) => (
                    <li key={idx} className="flex items-baseline justify-between gap-3 text-[0.95rem]">
                      <span className="flex flex-wrap items-baseline gap-x-2 text-gray-900">
                        {item.rohlikName ?? item.name}
                        <span className="text-gray-500">{item.amount}{item.unit}</span>
                        {item.rohlikUrl && (
                          <a
                            href={item.rohlikUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Zobrazit ${item.name} na Rohlík.cz`}
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-brand-600 text-[10px] font-bold text-brand-600"
                          >
                            i
                          </a>
                        )}
                        {!item.rohlikUrl && (
                          <a
                            href={`https://www.rohlik.cz/hledat?q=${encodeURIComponent(item.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Hledat ${item.name} na Rohlík.cz`}
                            className="inline-flex h-4 w-4 items-center justify-center text-gray-400"
                          >
                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                              <circle cx="7" cy="7" r="4.5" />
                              <path d="M10.5 10.5L14 14" strokeLinecap="round" />
                            </svg>
                          </a>
                        )}
                      </span>
                      {item.rohlikPrice != null && (
                        <span className="whitespace-nowrap text-sm text-gray-600">
                          {Math.round(item.rohlikPrice)} Kč
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>

        {priced > 0 && (
          <div className="mt-6 flex items-baseline justify-between border-t-2 border-gray-900 pt-4">
            <span className="text-sm text-gray-600">
              Odhad ({priced} z {items.length} položek)
            </span>
            <span className="font-display text-2xl font-bold">{Math.round(total).toLocaleString("cs")} Kč</span>
          </div>
        )}

        <p className="mt-8 text-sm text-gray-500">
          Ceny jsou orientační podle Rohlík.cz a mohou se lišit.
        </p>
      </div>
    </div>
  );
}
