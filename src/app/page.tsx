import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">F</span>
          </div>
          <span className="font-bold text-gray-900 text-lg">Kostki</span>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium text-sm"
          >
            Přihlásit se
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium text-sm hover:bg-brand-700 transition-colors"
          >
            Začít zdarma
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-sm font-medium mb-6">
          <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span>
          Automatický nákup přes Rohlík.cz
        </div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Zdravé jídlo bez<br />
          <span className="text-brand-600">jakékoli námahy</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Navolíte si, jak zdravě a chutně chcete jíst. My vytvoříme jídelníček,
          nakoupíme suroviny na Rohlíku a vy jen uvaříte podle receptu.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="px-8 py-4 bg-brand-600 text-white rounded-xl font-semibold text-lg hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200"
          >
            Vytvořit účet zdarma
          </Link>
          <Link
            href="#jak-to-funguje"
            className="px-8 py-4 border border-gray-200 text-gray-700 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-colors"
          >
            Jak to funguje?
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section id="jak-to-funguje" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          3 kroky k jídlu bez starostí
        </h2>
        <p className="text-center text-gray-500 mb-12">
          Jednou nastavíte, pak už jen přebíráte nákup a vaříte
        </p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              icon: "🎛️",
              title: "Nastavíte preference",
              desc: "Řeknete nám, jak zdravě a chutně chcete jíst, kolik vás je doma a jaký máte rozpočet.",
            },
            {
              step: "02",
              icon: "🤖",
              title: "AI vytvoří jídelníček",
              desc: "Claude AI sestaví týdenní jídelníček na míru a automaticky nakoupí vše potřebné na Rohlíku.",
            },
            {
              step: "03",
              icon: "🛒",
              title: "Vy jen potvrdíte",
              desc: "Dostanete notifikaci, zkontrolujete košík a potvrdíte objednávku na Rohlík.cz. To je vše.",
            },
          ].map((item) => (
            <div key={item.step} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="text-4xl mb-4">{item.icon}</div>
              <div className="text-xs font-bold text-brand-500 mb-2">{item.step}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{item.title}</h3>
              <p className="text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Vše co potřebujete
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🥗", title: "Jídelníček na míru", desc: "Zdravost vs. chutnost, diety, alergie, oblíbené kuchyně" },
              { icon: "📋", title: "Recepty s kroky", desc: "Každé jídlo má detailní recept s přesným časem přípravy" },
              { icon: "🛒", title: "Auto-nákup Rohlík", desc: "Přímo napojeno na váš Rohlík účet přes MCP" },
              { icon: "💰", title: "Respektuje rozpočet", desc: "Nastavíte týdenní limit, AI ho dodrží" },
              { icon: "📱", title: "Notifikace", desc: "Upozornění před každou objednávkou ke kontrole" },
              { icon: "🔄", title: "Každý týden nové", desc: "Žádné opakování jídel, stále čerstvé nápady" },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Připraveni začít?
        </h2>
        <p className="text-gray-500 mb-8">
          Registrace je zdarma. Potřebujete jen účet na Rohlík.cz.
        </p>
        <Link
          href="/register"
          className="inline-block px-10 py-4 bg-brand-600 text-white rounded-xl font-semibold text-lg hover:bg-brand-700 transition-colors"
        >
          Začít zdarma
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        Kostki © 2025 · Vytvořeno s Claude AI + Rohlík MCP
      </footer>
    </div>
  );
}
