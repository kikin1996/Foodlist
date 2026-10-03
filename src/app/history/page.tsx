import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const plans = await prisma.mealPlan.findMany({
    where: { userId: session.user.id, status: "ARCHIVED" },
    orderBy: { weekStart: "desc" },
    select: { id: true, weekStart: true },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="font-bold text-gray-900">Kostki</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-900">
            ← Zpět na dashboard
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Historie jídelníčků</h1>
        {plans.length === 0 ? (
          <p className="text-gray-500">Zatím nemáš žádné archivované jídelníčky.</p>
        ) : (
          <ul className="space-y-3">
            {plans.map((plan) => (
              <li key={plan.id}>
                <Link
                  href={`/history/${plan.id}`}
                  className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-brand-200 transition-colors"
                >
                  <span className="font-semibold text-gray-900">
                    Týden od {plan.weekStart.toLocaleDateString("cs-CZ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
