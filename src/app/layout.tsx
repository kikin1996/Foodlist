import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kostki – Nakupujeme za vás",
  description: "AI jídelníček + automatický nákup na Rohlík.cz. Zdravě, chutně, bez starostí.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
