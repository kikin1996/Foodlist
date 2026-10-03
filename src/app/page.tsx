import Link from "next/link";

const SAMPLE_WEEK = [
  { day: "Po", dinner: "Dušená kuřecí stehna s rýží" },
  { day: "Út", dinner: "Čočková polévka s uzeným" },
  { day: "St", dinner: "Rizoto s hráškem a parmazánem" },
  { day: "Čt", dinner: "Hovězí chilli con carne" },
  { day: "Pá", dinner: "Losos z pečicí pánve" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <span className="font-display text-2xl font-extrabold tracking-tight text-brand-600">Kostki</span>
        <nav className="flex items-center gap-5 text-sm font-medium">
          <Link href="/login" className="text-gray-600 hover:text-gray-900">
            Přihlásit se
          </Link>
          <Link
            href="/register"
            className="bg-brand-600 px-4 py-2.5 text-white hover:bg-brand-700 transition-colors"
          >
            Vytvořit účet
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-5">
        <section className="grid gap-12 pb-20 pt-10 md:grid-cols-[1.1fr_1fr] md:items-center md:pt-16">
          <div>
            <h1 className="text-[2.75rem] font-extrabold md:text-6xl">
              Týden jídel a nákupní seznam za pár minut.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-gray-600">
              Řekněte, jak chcete jíst a kolik vás je. Kostki sestaví jídelníček
              a z produktů, které jsou na Rohlík.cz dnes skladem, udělá nákupní
              seznam. Ten si přečtete v mobilu jedním naskenováním QR kódu.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/register"
                className="bg-brand-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                Vytvořit účet zdarma
              </Link>
              <Link
                href="#jak-to-funguje"
                className="border-b-2 border-gray-900 py-3.5 text-base font-semibold text-gray-900 hover:border-brand-600 hover:text-brand-600 transition-colors"
              >
                Jak to funguje
              </Link>
            </div>
          </div>

          <div className="border-2 border-gray-900">
            <div className="grid grid-cols-[3.5rem_1fr] border-b-2 border-gray-900 bg-gray-900 px-4 py-3 text-sm font-semibold text-white">
              <span>Den</span>
              <span>Večeře</span>
            </div>
            {SAMPLE_WEEK.map((row) => (
              <div
                key={row.day}
                className="grid grid-cols-[3.5rem_1fr] items-baseline gap-2 border-b border-gray-200 px-4 py-3.5 last:border-b-0"
              >
                <span className="font-display text-lg font-bold text-brand-600">{row.day}</span>
                <span className="text-[0.95rem] text-gray-800">{row.dinner}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="jak-to-funguje" className="border-t-2 border-gray-900 py-16">
          <h2 className="text-3xl font-bold md:text-4xl">Jak to funguje</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            <li>
              <h3 className="text-xl">Nastavíte preference</h3>
              <p className="mt-3 leading-relaxed text-gray-600">
                Zdravost, chutnost, diety, alergie, rozpočet a počet lidí u stolu.
              </p>
            </li>
            <li>
              <h3 className="text-xl">Dostanete jídelníček</h3>
              <p className="mt-3 leading-relaxed text-gray-600">
                Ke každému jídlu recept. Jedno jídlo můžete přegenerovat, když se
                vám nechce.
              </p>
            </li>
            <li>
              <h3 className="text-xl">Nakoupíte podle seznamu</h3>
              <p className="mt-3 leading-relaxed text-gray-600">
                Seznam naskenujete v mobilu nebo si ho uložíte jako fotku. U položek
                vidíte přímý odkaz na produkt na Rohlík.cz.
              </p>
            </li>
          </ol>
        </section>

        <section className="border-t border-gray-200 py-16">
          <h2 className="text-3xl font-bold md:text-4xl">Co umí</h2>
          <ul className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {[
              ["Jídla na míru", "Víc zeleniny, nebo víc chuti. Vy určíte poměr."],
              ["Chytré kuchyňské roboty", "Thermomix a Monsieur Cuisine: jídla, která v nich půjdou udělat, a jejich postup."],
              ["Skladem dnes", "Nákupní seznam jen z produktů, které Rohlík právě nabízí."],
              ["Historie týdnů", "Staré jídelníčky si odložíte a vrátíte se k nim kdykoli."],
            ].map(([title, desc]) => (
              <li key={title} className="border-l-4 border-brand-600 pl-5">
                <h3 className="text-lg">{title}</h3>
                <p className="mt-2 leading-relaxed text-gray-600">{desc}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t-2 border-gray-900 py-16">
          <h2 className="max-w-xl text-3xl font-bold md:text-4xl">
            Registrace je zdarma. Na Rohlík.cz účet nepotřebujete.
          </h2>
          <Link
            href="/register"
            className="mt-8 inline-block bg-brand-600 px-8 py-4 text-base font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Vytvořit účet
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-200">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-2 px-5 py-6 text-sm text-gray-500">
          <span className="font-display font-bold text-gray-900">Kostki</span>
          <span>Jídelníček a nákupní seznam pro české domácnosti</span>
        </div>
      </footer>
    </div>
  );
}
