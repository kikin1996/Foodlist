import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

const body = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kostki – jídelníček a nákupní seznam",
  description: "Týdenní jídelníček na míru a nákupní seznam z dostupných produktů Rohlík.cz.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen bg-white font-sans text-gray-900 antialiased">{children}</body>
    </html>
  );
}
