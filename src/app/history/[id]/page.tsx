import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import MealPlanView from "@/components/MealPlanView";
import AppHeader from "@/components/AppHeader";

export default async function HistoryPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const plan = await prisma.mealPlan.findFirst({
    where: { id, userId: session.user.id, status: "ARCHIVED" },
    include: {
      orders: { orderBy: { createdAt: "desc" }, take: 1 },
      user: { include: { preferences: true } },
    },
  });
  if (!plan) notFound();

  return (
    <div className="min-h-screen">
      <AppHeader current="/history" />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Link href="/history" className="text-sm font-semibold text-brand-600 underline underline-offset-4">
          Zpět na historii
        </Link>
        <h1 className="mt-6 text-4xl font-extrabold">
          Týden od {plan.weekStart.toLocaleDateString("cs-CZ")}
        </h1>
        <div className="mt-8">
          <MealPlanView
            plan={plan}
            kitchenAppliance={plan.user.preferences?.kitchenAppliance ?? "none"}
          />
        </div>
      </main>
    </div>
  );
}
