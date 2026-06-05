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

// Klíčové kategorie — optimalizováno pro Vercel 60s timeout (10 batches × 4 = 40 dotazů)
const CATEGORIES: { keyword: string; cat: string }[] = [
  { keyword: "kuřecí prsa", cat: "maso" },
  { keyword: "vepřová krkovice", cat: "maso" },
  { keyword: "losos filet", cat: "maso" },
  { keyword: "mleté maso", cat: "maso" },
  { keyword: "vejce", cat: "mlecne" },
  { keyword: "mléko", cat: "mlecne" },
  { keyword: "máslo", cat: "mlecne" },
  { keyword: "jogurt řecký", cat: "mlecne" },
  { keyword: "eidam sýr", cat: "mlecne" },
  { keyword: "mozzarella", cat: "mlecne" },
  { keyword: "smetana na vaření", cat: "mlecne" },
  { keyword: "tvaroh", cat: "mlecne" },
  { keyword: "rajčata", cat: "zelenina" },
  { keyword: "paprika", cat: "zelenina" },
  { keyword: "cibule", cat: "zelenina" },
  { keyword: "česnek", cat: "zelenina" },
  { keyword: "brambory", cat: "zelenina" },
  { keyword: "mrkev", cat: "zelenina" },
  { keyword: "brokolice", cat: "zelenina" },
  { keyword: "špenát", cat: "zelenina" },
  { keyword: "cuketa", cat: "zelenina" },
  { keyword: "okurka", cat: "zelenina" },
  { keyword: "banán", cat: "ovoce" },
  { keyword: "jablko", cat: "ovoce" },
  { keyword: "pomeranč", cat: "ovoce" },
  { keyword: "citrón", cat: "ovoce" },
  { keyword: "chléb celozrnný", cat: "pecivo" },
  { keyword: "toastový chléb", cat: "pecivo" },
  { keyword: "rohlík", cat: "pecivo" },
  { keyword: "tortilla wrap", cat: "pecivo" },
  { keyword: "těstoviny", cat: "suche" },
  { keyword: "rýže", cat: "suche" },
  { keyword: "ovesné vločky", cat: "suche" },
  { keyword: "čočka", cat: "suche" },
  { keyword: "kuskus", cat: "suche" },
  { keyword: "rajčata konzerva", cat: "ostatni" },
  { keyword: "kokosové mléko", cat: "ostatni" },
  { keyword: "olivový olej", cat: "ostatni" },
  { keyword: "sójová omáčka", cat: "ostatni" },
  { keyword: "vývar kuřecí", cat: "ostatni" },
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
  const batches = chunk(CATEGORIES, 4);

  console.log(`Stahuji katalog: ${CATEGORIES.length} dotazů v ${batches.length} dávkách`);

  try {
    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi];
      try {
        const result = await client.callTool({
          name: "batch_search_products",
          arguments: { queries: batch.map((q) => ({ keyword: q.keyword })) },
        });
        const data = JSON.parse((result.content as { type: string; text: string }[])[0].text);

        for (let i = 0; i < batch.length; i++) {
          const prods = data.results?.[i]?.products ?? [];
          const best = prods.filter((p: { inStock: boolean }) => p.inStock).slice(0, 5);
          for (const p of best) {
            // Deduplikuj podle productId
            if (!products.find((x) => x.id === p.productId)) {
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
      } catch (e) {
        const msg = String(e);
        if (msg.includes("1015") || msg.includes("rate_limit")) {
          console.log(`Rate limit při katalogu dávka ${bi + 1}, čekám 35s...`);
          await sleep(35000);
          bi--; // opakuj tuto dávku
          continue;
        }
        console.warn(`Katalog dávka ${bi + 1} selhala:`, msg.slice(0, 80));
      }
      if (bi < batches.length - 1) await sleep(1500);
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
