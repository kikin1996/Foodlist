import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import MealPlanView from "@/components/MealPlanView";

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/history" className="text-sm text-gray-500 hover:text-gray-900">
            ← Zpět na historii
          </Link>
          <span className="font-semibold text-gray-900">
            Týden od {plan.weekStart.toLocaleDateString("cs-CZ")}
          </span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <MealPlanView
          plan={plan}
          kitchenAppliance={plan.user.preferences?.kitchenAppliance ?? "none"}
        />
      </main>
    </div>
  );
}
