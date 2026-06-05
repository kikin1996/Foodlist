import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import PreferencesForm from "@/components/PreferencesForm";

export default async function PreferencesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { preferences: true },
  });

  if (!user) redirect("/login");

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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Nastavení preferencí</h1>
        <PreferencesForm
          initialData={{
            healthLevel: user.preferences?.healthLevel ?? 7,
            tastyLevel: user.preferences?.tastyLevel ?? 7,
            householdSize: user.preferences?.householdSize ?? 2,
            weeklyBudget: user.preferences?.weeklyBudget ?? 2000,
            deliveryDay: user.preferences?.deliveryDay ?? "wednesday",
            deliveryTime: user.preferences?.deliveryTime ?? "morning",
            isVegetarian: user.preferences?.isVegetarian ?? false,
            isVegan: user.preferences?.isVegan ?? false,
            isGlutenFree: user.preferences?.isGlutenFree ?? false,
            isLactoseFree: user.preferences?.isLactoseFree ?? false,
            allergies: user.preferences?.allergies ?? "",
            cuisinePreferences: user.preferences?.cuisinePreferences ?? "",
            dislikedIngredients: user.preferences?.dislikedIngredients ?? "",
            rohlikEmail: user.rohlikEmail ?? "",
            includedMeals: user.preferences?.includedMeals ?? "breakfast,lunch,dinner",
            includedDays: user.preferences?.includedDays ?? "pondeli,utery,streda,ctvrtek,patek,sobota,nedele",
            aiModel: user.preferences?.aiModel ?? "claude-haiku-4-5-20251001",
          }}
        />
      </main>
    </div>
  );
}
