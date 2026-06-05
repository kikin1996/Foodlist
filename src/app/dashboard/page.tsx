import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import MealPlanView from "@/components/MealPlanView";
import GeneratePlanButton from "@/components/GeneratePlanButton";
import ResetPlanButton from "@/components/ResetPlanButton";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      preferences: true,
      mealPlans: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { orders: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });

  if (!user?.preferences) redirect("/onboarding");

  const currentPlan = user.mealPlans[0] ?? null;
  const currentOrder = currentPlan?.orders[0] ?? null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="font-bold text-gray-900">Kostki</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/catalog" className="text-sm text-gray-500 hover:text-gray-900">
              Katalog potravin
            </Link>
            <Link href="/preferences" className="text-sm text-gray-500 hover:text-gray-900">
              Nastavení
            </Link>
            <Link
              href="/api/auth/signout"
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Odhlásit
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Ahoj, {user.name?.split(" ")[0] ?? "uživateli"} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            {currentPlan
              ? "Váš aktuální jídelníček"
              : "Vygenerujte svůj první jídelníček"}
          </p>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Zdravost</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-gray-900">
                {user.preferences.healthLevel}
              </div>
              <div className="text-sm text-gray-400">/10</div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Týdenní rozpočet</div>
            <div className="text-2xl font-bold text-gray-900">
              {user.preferences.weeklyBudget.toLocaleString("cs")} Kč
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Stav objednávky</div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  currentOrder?.status === "CART_FILLED"
                    ? "bg-yellow-400"
                    : currentOrder?.status === "CONFIRMED_BY_USER"
                    ? "bg-green-400"
                    : "bg-gray-300"
                }`}
              />
              <div className="text-sm font-medium text-gray-700">
                {currentOrder?.status === "CART_FILLED"
                  ? "Čeká na potvrzení"
                  : currentOrder?.status === "CONFIRMED_BY_USER"
                  ? "Potvrzeno"
                  : currentOrder?.status === "DELIVERED"
                  ? "Doručeno"
                  : "Žádná objednávka"}
              </div>
            </div>
          </div>
        </div>

        {/* Cart filled notification */}
        {currentOrder?.status === "CART_FILLED" && (() => {
          const addedCount = Array.isArray(currentOrder.rohlikCartItems)
            ? (currentOrder.rohlikCartItems as unknown[]).length
            : 0;
          const totalCount = Array.isArray(currentPlan?.shoppingList)
            ? (currentPlan!.shoppingList as unknown[]).length
            : 0;
          const allAdded = addedCount >= totalCount && totalCount > 0;
          const noneAdded = addedCount === 0;

          return (
            <div className={`rounded-xl p-5 mb-6 flex items-start gap-4 border ${noneAdded ? "bg-red-50 border-red-200" : allAdded ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
              <div className="text-2xl">{noneAdded ? "❌" : allAdded ? "✅" : "⚠️"}</div>
              <div className="flex-1">
                <div className={`font-semibold ${noneAdded ? "text-red-900" : allAdded ? "text-green-900" : "text-yellow-900"}`}>
                  {noneAdded ? "Košík je prázdný!" : allAdded ? "Košík je připravený!" : "Košík je částečně připravený"}
                </div>

                {/* Počítadlo položek */}
                <div className="flex items-center gap-2 mt-2">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                    noneAdded ? "bg-red-100 text-red-800" :
                    allAdded ? "bg-green-100 text-green-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>
                    🛒 {addedCount} / {totalCount} položek v košíku
                  </div>
                  {!allAdded && !noneAdded && (
                    <span className="text-xs text-red-600 font-medium">
                      ⚠️ {totalCount - addedCount} položek chybí
                    </span>
                  )}
                </div>

                {noneAdded && (
                  <p className="text-sm text-red-700 mt-1">
                    Zkontrolujte přihlašovací údaje k Rohlík.cz v Nastavení a zkuste nakoupit znovu.
                  </p>
                )}
                {!noneAdded && !allAdded && (
                  <p className="text-sm text-yellow-700 mt-1">
                    Část položek se nepodařilo najít na Rohlíku. Zkontrolujte košík a doplňte ručně.
                  </p>
                )}

                {currentOrder.estimatedTotal ? (
                  <p className="text-sm text-gray-500 mt-1">
                    Odhadovaná cena: <strong>{Math.round(currentOrder.estimatedTotal).toLocaleString("cs")} Kč</strong>
                  </p>
                ) : null}

                {!noneAdded && (
                  <div className="flex gap-3 mt-3">
                    <a
                      href="https://www.rohlik.cz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${allAdded ? "bg-green-600 hover:bg-green-700" : "bg-yellow-600 hover:bg-yellow-700"}`}
                    >
                      Otevřít Rohlík.cz
                    </a>
                    <form action="/api/orders/confirm" method="POST">
                      <input type="hidden" name="orderId" value={currentOrder.id} />
                      <button type="submit" className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
                        Označit jako potvrzeno
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Meal plan or generate */}
        {currentPlan ? (
          <MealPlanView plan={currentPlan} />
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="text-5xl mb-4">🥗</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Žádný jídelníček zatím
            </h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Klikněte na tlačítko a AI vygeneruje jídelníček na celý týden
              přesně podle vašich preferencí.
            </p>
            <GeneratePlanButton />
          </div>
        )}

        {/* Generate new plan button (when plan exists) */}
        {currentPlan && (
          <div className="mt-6 flex items-center justify-between">
            <ResetPlanButton />
            <GeneratePlanButton label="Vygenerovat nový jídelníček" />
          </div>
        )}
      </main>
    </div>
  );
}
