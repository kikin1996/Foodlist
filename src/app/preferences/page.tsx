import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import PreferencesForm from "@/components/PreferencesForm";
import AppHeader from "@/components/AppHeader";

export default async function PreferencesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { preferences: true },
  });

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <AppHeader current="/preferences" />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-4xl font-extrabold">Nastavení</h1>
        <div className="mt-6">
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
              aiModel: user.preferences?.aiModel ?? "gpt-5-mini",
              kitchenAppliance: user.preferences?.kitchenAppliance ?? "none",
            }}
          />
        </div>
      </main>
    </div>
  );
}
