import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const ROHLIK_MCP_URL = "https://mcp.rohlik.cz/mcp";

export interface CatalogProduct {
  id: number;
  name: string;
  price: number;
  amount: string;
  category: string;
}

// Kategorie — optimalizováno pro Vercel 60s timeout (16 batches × 4 = 64 dotazů)
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

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export async function fetchRohlikCatalog(
  email: string,
  password: string
): Promise<CatalogProduct[]> {
  const transport = new StreamableHTTPClientTransport(new URL(ROHLIK_MCP_URL), {
    requestInit: { headers: { "rhl-email": email, "rhl-pass": password } },
  });
  const client = new Client({ name: "kostki-catalog", version: "1.0.0" });
  await client.connect(transport);

  const products: CatalogProduct[] = [];
  const batches = chunk(CATEGORIES, 6);

  console.log(`Stahuji katalog: ${CATEGORIES.length} dotazů v ${batches.length} dávkách (po 2 souběžně)`);

  // Max 2 dávky souběžně s krátkou pauzou — plný paralelismus spouští Cloudflare rate limit
  try {
    async function runBatch(batch: { keyword: string; cat: string }[]) {
      const result = await client.callTool({
        name: "batch_search_products",
        arguments: { queries: batch.map((q) => ({ keyword: q.keyword })) },
      });
      const data = JSON.parse((result.content as { type: string; text: string }[])[0].text);
      return { batch, data };
    }

    const batchResults: PromiseSettledResult<Awaited<ReturnType<typeof runBatch>>>[] = [];
    const groups = chunk(batches, 2);
    for (let gi = 0; gi < groups.length; gi++) {
      const results = await Promise.allSettled(groups[gi].map(runBatch));
      batchResults.push(...results);
      if (gi < groups.length - 1) await sleep(1500);
    }

    const seen = new Set<number>();
    for (const res of batchResults) {
      if (res.status === "rejected") {
        console.warn("Dávka selhala:", String(res.reason).slice(0, 60));
        continue;
      }
      const { batch, data } = res.value;
      for (let i = 0; i < batch.length; i++) {
        const prods = data.results?.[i]?.products ?? [];
        for (const p of prods.filter((p: { inStock: boolean }) => p.inStock).slice(0, 6)) {
          if (!seen.has(p.productId)) {
            seen.add(p.productId);
            products.push({
              id: p.productId,
              name: p.productName,
              price: p.price,
              amount: p.textualAmount ?? "",
              category: batch[i].cat,
            });
          }
        }
      }
    }
  } finally {
    await client.close();
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
