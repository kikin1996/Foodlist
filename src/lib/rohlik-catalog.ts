import { RohlikClient } from "./rohlik-client";

export interface CatalogProduct {
  id: number;
  name: string;
  price: number;
  amount: string;
  category: string;
}

const CATEGORIES: { keyword: string; cat: string }[] = [
  // Maso & ryby
  { keyword: "kuřecí prsa", cat: "maso" },
  { keyword: "vepřová krkovice", cat: "maso" },
  { keyword: "losos filet", cat: "maso" },
  { keyword: "mleté maso hovězí", cat: "maso" },
  { keyword: "kuřecí stehno", cat: "maso" },
  { keyword: "vepřová panenka", cat: "maso" },
  { keyword: "treska filet", cat: "maso" },
  { keyword: "slanina", cat: "maso" },
  // Mléčné
  { keyword: "vejce", cat: "mlecne" },
  { keyword: "mléko", cat: "mlecne" },
  { keyword: "máslo", cat: "mlecne" },
  { keyword: "jogurt řecký", cat: "mlecne" },
  { keyword: "eidam sýr", cat: "mlecne" },
  { keyword: "mozzarella", cat: "mlecne" },
  { keyword: "smetana na vaření", cat: "mlecne" },
  { keyword: "tvaroh", cat: "mlecne" },
  // Zelenina
  { keyword: "rajčata", cat: "zelenina" },
  { keyword: "paprika červená", cat: "zelenina" },
  { keyword: "cibule", cat: "zelenina" },
  { keyword: "česnek", cat: "zelenina" },
  { keyword: "brambory", cat: "zelenina" },
  { keyword: "mrkev", cat: "zelenina" },
  { keyword: "brokolice", cat: "zelenina" },
  { keyword: "špenát", cat: "zelenina" },
  { keyword: "cuketa", cat: "zelenina" },
  { keyword: "okurka", cat: "zelenina" },
  { keyword: "lilek", cat: "zelenina" },
  { keyword: "pórek", cat: "zelenina" },
  // Ovoce
  { keyword: "banán", cat: "ovoce" },
  { keyword: "jablko", cat: "ovoce" },
  { keyword: "pomeranč", cat: "ovoce" },
  { keyword: "citrón", cat: "ovoce" },
  { keyword: "jahody", cat: "ovoce" },
  { keyword: "borůvky", cat: "ovoce" },
  // Pečivo
  { keyword: "chléb celozrnný", cat: "pecivo" },
  { keyword: "toastový chléb", cat: "pecivo" },
  { keyword: "rohlík", cat: "pecivo" },
  { keyword: "tortilla wrap", cat: "pecivo" },
  // Suché potraviny
  { keyword: "těstoviny špagety", cat: "suche" },
  { keyword: "rýže jasmínová", cat: "suche" },
  { keyword: "ovesné vločky", cat: "suche" },
  { keyword: "čočka červená", cat: "suche" },
  { keyword: "kuskus", cat: "suche" },
  { keyword: "quinoa", cat: "suche" },
  { keyword: "cizrna konzerva", cat: "suche" },
  { keyword: "fazole konzerva", cat: "suche" },
  { keyword: "tuňák konzerva", cat: "suche" },
  { keyword: "tagliatelle", cat: "suche" },
  // Bylinky
  { keyword: "petržel čerstvá", cat: "zelenina" },
  { keyword: "bazalka čerstvá", cat: "zelenina" },
  { keyword: "avokádo", cat: "ovoce" },
  { keyword: "limetka", cat: "ovoce" },
  // Ryby a mořské plody
  { keyword: "krevety", cat: "maso" },
  { keyword: "pstruh", cat: "maso" },
  { keyword: "kachní prsa", cat: "maso" },
  { keyword: "hovězí steak", cat: "maso" },
  { keyword: "ricotta", cat: "mlecne" },
  // Ostatní (oleje, omáčky, konzervy)
  { keyword: "rajčata konzerva", cat: "ostatni" },
  { keyword: "kokosové mléko", cat: "ostatni" },
  { keyword: "olivový olej", cat: "ostatni" },
  { keyword: "sójová omáčka", cat: "ostatni" },
  { keyword: "vývar kuřecí", cat: "ostatni" },
  { keyword: "pesto bazalkové", cat: "ostatni" },
  { keyword: "med", cat: "ostatni" },
  { keyword: "hořčice", cat: "ostatni" },
  // Nápoje & pivo
  { keyword: "pivo Stella", cat: "napoje" },
  { keyword: "pivo ležák", cat: "napoje" },
  { keyword: "pivo nealkoholické", cat: "napoje" },
  { keyword: "džus pomerančový", cat: "napoje" },
  { keyword: "minerální voda", cat: "napoje" },
];

const CATALOG_MAX_AGE_HOURS = 24;

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchRohlikCatalog(
  email: string,
  password: string
): Promise<CatalogProduct[]> {
  const client = new RohlikClient();
  await client.login(email, password);

  const products: CatalogProduct[] = [];
  const seen = new Set<number>();
  const groups = chunk(CATEGORIES, 3);

  console.log(`Stahuji katalog: ${CATEGORIES.length} dotazů (po 3 souběžně)`);

  for (let gi = 0; gi < groups.length; gi++) {
    const results = await Promise.allSettled(
      groups[gi].map(async (q) => ({ q, items: await client.searchProducts(q.keyword) }))
    );
    if (gi < groups.length - 1) await sleep(300);
    for (const res of results) {
      if (res.status === "rejected") {
        console.warn("Dotaz selhal:", String(res.reason).slice(0, 60));
        continue;
      }
      const { q, items } = res.value;
      for (const p of items.slice(0, 6)) {
        if (!seen.has(p.productId)) {
          seen.add(p.productId);
          products.push({
            id: p.productId,
            name: p.productName,
            price: p.price,
            amount: p.textualAmount ?? "",
            category: q.cat,
          });
        }
      }
    }
  }

  console.log(`Katalog dokončen: ${products.length} unikátních produktů`);
  return products;
}

export function isCatalogFresh(updatedAt: Date | null): boolean {
  if (!updatedAt) return false;
  const ageHours = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
  return ageHours < CATALOG_MAX_AGE_HOURS;
}

export function catalogToContext(products: CatalogProduct[]): string {
  const byCat: Record<string, CatalogProduct[]> = {};
  for (const p of products) {
    (byCat[p.category] ??= []).push(p);
  }
  return Object.entries(byCat)
    .map(([cat, items]) =>
      `${cat}: ${items.map((p) => `${p.name}(${p.amount},${Math.round(p.price)}Kč)`).join(", ")}`
    )
    .join("\n");
}
