import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import MealPlanView from "@/components/MealPlanView";
import GeneratePlanButton from "@/components/GeneratePlanButton";

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
        {currentOrder?.status === "CART_FILLED" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-6 flex items-start gap-4">
            <div className="text-2xl">🛒</div>
            <div className="flex-1">
              <div className="font-semibold text-yellow-900">Košík je připravený!</div>
              <div className="text-sm text-yellow-700 mt-1">
                Přidali jsme všechny položky do vašeho košíku na Rohlík.cz.
                Zkontrolujte ho a potvrďte objednávku.
              </div>
              <div className="flex gap-3 mt-3">
                <a
                  href="https://www.rohlik.cz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Otevřít Rohlík.cz
                </a>
                <form action="/api/orders/confirm" method="POST">
                  <input type="hidden" name="orderId" value={currentOrder.id} />
                  <button
                    type="submit"
                    className="px-4 py-2 border border-yellow-300 text-yellow-800 text-sm font-medium rounded-lg hover:bg-yellow-100 transition-colors"
                  >
                    Označit jako potvrzeno
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

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
          <div className="mt-6 flex justify-end">
            <GeneratePlanButton label="Vygenerovat nový jídelníček" />
          </div>
        )}
      </main>
    </div>
  );
}
