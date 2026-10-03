import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import MealPlanView from "@/components/MealPlanView";
import GeneratePlanButton from "@/components/GeneratePlanButton";
import ResetPlanButton from "@/components/ResetPlanButton";
import AppHeader from "@/components/AppHeader";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      preferences: true,
      mealPlans: {
        where: { status: { not: "ARCHIVED" } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { orders: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });

  if (!user?.preferences) redirect("/onboarding");

  const currentPlan = user.mealPlans[0] ?? null;
  const firstName = user.name?.split(" ")[0];

  return (
    <div className="min-h-screen">
      <AppHeader current="/dashboard" />

      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-4xl font-extrabold md:text-5xl">
          {currentPlan ? "Tento týden" : `Ahoj${firstName ? `, ${firstName}` : ""}.`}
        </h1>

        <dl className="mt-8 grid grid-cols-3 border-y border-gray-200 py-5 text-center">
          <div className="border-r border-gray-200 px-2">
            <dt className="text-sm text-gray-600">Zdravost</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{user.preferences.healthLevel}/10</dd>
          </div>
          <div className="border-r border-gray-200 px-2">
            <dt className="text-sm text-gray-600">Rozpočet na týden</dt>
            <dd className="mt-1 font-display text-2xl font-bold">
              {user.preferences.weeklyBudget.toLocaleString("cs")} Kč
            </dd>
          </div>
          <div className="px-2">
            <dt className="text-sm text-gray-600">Lidí u stolu</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{user.preferences.householdSize}</dd>
          </div>
        </dl>

        <div className="mt-10">
          {currentPlan ? (
            <>
              <MealPlanView plan={currentPlan} kitchenAppliance={user.preferences.kitchenAppliance} />
              <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6">
                <ResetPlanButton />
                <GeneratePlanButton
                  label="Schovat do historie a připravit další týden"
                  archiveId={currentPlan.id}
                />
              </div>
            </>
          ) : (
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold">Zatím žádný jídelníček</h2>
              <p className="mt-3 leading-relaxed text-gray-600">
                Vygenerujeme jídla na celý týden podle vašich preferencí. Nákupní seznam
                složíme z produktů, které jsou na Rohlík.cz dnes skladem.
              </p>
              <div className="mt-8">
                <GeneratePlanButton />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
