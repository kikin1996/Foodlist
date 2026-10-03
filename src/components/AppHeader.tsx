import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "Týden" },
  { href: "/history", label: "Historie" },
  { href: "/catalog", label: "Katalog" },
  { href: "/preferences", label: "Nastavení" },
];

export default function AppHeader({ current }: { current?: string }) {
  return (
    <header className="border-b-2 border-gray-900">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-y-3 px-5 py-4">
        <Link href="/dashboard" className="font-display text-2xl font-extrabold tracking-tight text-brand-600">
          Kostki
        </Link>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current === item.href ? "page" : undefined}
              className={
                current === item.href
                  ? "border-b-2 border-brand-600 pb-0.5 text-brand-600"
                  : "pb-0.5 text-gray-600 hover:text-gray-900"
              }
            >
              {item.label}
            </Link>
          ))}
          <Link href="/api/auth/signout" className="pb-0.5 text-gray-500 hover:text-gray-900">
            Odhlásit
          </Link>
        </nav>
      </div>
    </header>
  );
}
