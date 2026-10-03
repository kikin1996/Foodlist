import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const plans = await prisma.mealPlan.findMany({
    where: { userId: session.user.id, status: "ARCHIVED" },
    orderBy: { weekStart: "desc" },
    select: { id: true, weekStart: true },
  });

  return (
    <div className="min-h-screen">
      <AppHeader current="/history" />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-4xl font-extrabold">Historie</h1>
        {plans.length === 0 ? (
          <p className="mt-6 max-w-md text-gray-600">
            Zatím tu nic není. Až schováte týden, objeví se tady.
          </p>
        ) : (
          <ul className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
            {plans.map((plan) => (
              <li key={plan.id}>
                <Link
                  href={`/history/${plan.id}`}
                  className="flex items-baseline justify-between py-4 text-lg font-semibold hover:text-brand-600"
                >
                  <span>Týden od {plan.weekStart.toLocaleDateString("cs-CZ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
