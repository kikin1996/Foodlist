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

// Rozsáhlý seznam kategorií — pokrývá většinu typických surovin
const CATEGORIES: { keyword: string; cat: string }[] = [
  // Maso & ryby
  { keyword: "kuřecí prsa", cat: "maso" },
  { keyword: "kuřecí stehna", cat: "maso" },
  { keyword: "vepřová krkovice", cat: "maso" },
  { keyword: "vepřová panenka", cat: "maso" },
  { keyword: "hovězí maso", cat: "maso" },
  { keyword: "mleté maso vepřové", cat: "maso" },
  { keyword: "mleté maso hovězí", cat: "maso" },
  { keyword: "slanina", cat: "maso" },
  { keyword: "šunka", cat: "maso" },
  { keyword: "losos filet", cat: "maso" },
  { keyword: "treska filet", cat: "maso" },
  { keyword: "tuňák konzerva", cat: "maso" },
  { keyword: "krevety", cat: "maso" },
  // Mléčné
  { keyword: "mléko plnotučné", cat: "mlecne" },
  { keyword: "mléko polotučné", cat: "mlecne" },
  { keyword: "máslo", cat: "mlecne" },
  { keyword: "smetana ke šlehání", cat: "mlecne" },
  { keyword: "smetana na vaření", cat: "mlecne" },
  { keyword: "jogurt bílý", cat: "mlecne" },
  { keyword: "jogurt řecký", cat: "mlecne" },
  { keyword: "eidam", cat: "mlecne" },
  { keyword: "gouda sýr", cat: "mlecne" },
  { keyword: "mozzarella", cat: "mlecne" },
  { keyword: "parmazán", cat: "mlecne" },
  { keyword: "cottage sýr", cat: "mlecne" },
  { keyword: "tvaroh měkký", cat: "mlecne" },
  { keyword: "vejce", cat: "mlecne" },
  // Zelenina
  { keyword: "rajčata", cat: "zelenina" },
  { keyword: "paprika červená", cat: "zelenina" },
  { keyword: "paprika žlutá", cat: "zelenina" },
  { keyword: "cibule žlutá", cat: "zelenina" },
  { keyword: "česnek", cat: "zelenina" },
  { keyword: "brambory", cat: "zelenina" },
  { keyword: "mrkev", cat: "zelenina" },
  { keyword: "brokolice", cat: "zelenina" },
  { keyword: "špenát", cat: "zelenina" },
  { keyword: "cuketa", cat: "zelenina" },
  { keyword: "lilek", cat: "zelenina" },
  { keyword: "zelí bílé", cat: "zelenina" },
  { keyword: "ledový salát", cat: "zelenina" },
  { keyword: "rukola", cat: "zelenina" },
  { keyword: "okurka salátová", cat: "zelenina" },
  { keyword: "pórek", cat: "zelenina" },
  { keyword: "hrášek mražený", cat: "zelenina" },
  { keyword: "kukuřice konzervovaná", cat: "zelenina" },
  { keyword: "fazole červené konzerva", cat: "zelenina" },
  { keyword: "cizrna konzerva", cat: "zelenina" },
  // Ovoce
  { keyword: "banán", cat: "ovoce" },
  { keyword: "jablko", cat: "ovoce" },
  { keyword: "pomeranč", cat: "ovoce" },
  { keyword: "citrón", cat: "ovoce" },
  { keyword: "jahody", cat: "ovoce" },
  { keyword: "borůvky", cat: "ovoce" },
  { keyword: "hruška", cat: "ovoce" },
  // Pečivo & obiloviny
  { keyword: "chléb celozrnný", cat: "pecivo" },
  { keyword: "toastový chléb", cat: "pecivo" },
  { keyword: "rohlík", cat: "pecivo" },
  { keyword: "bageta", cat: "pecivo" },
  { keyword: "tortilla wrap", cat: "pecivo" },
  // Suché potraviny
  { keyword: "těstoviny špagety", cat: "suche" },
  { keyword: "těstoviny penne", cat: "suche" },
  { keyword: "rýže dlouhozrnná", cat: "suche" },
  { keyword: "rýže basmati", cat: "suche" },
  { keyword: "ovesné vločky", cat: "suche" },
  { keyword: "müsli", cat: "suche" },
  { keyword: "čočka červená", cat: "suche" },
  { keyword: "kuskus", cat: "suche" },
  { keyword: "bulgur", cat: "suche" },
  { keyword: "mouka hladká", cat: "suche" },
  // Konzervy & omáčky
  { keyword: "rajčata krájená konzerva", cat: "ostatni" },
  { keyword: "kokosové mléko", cat: "ostatni" },
  { keyword: "sójová omáčka", cat: "ostatni" },
  { keyword: "olivový olej", cat: "ostatni" },
  { keyword: "slunečnicový olej", cat: "ostatni" },
  { keyword: "hořčice", cat: "ostatni" },
  { keyword: "kečup", cat: "ostatni" },
  { keyword: "med", cat: "ostatni" },
  { keyword: "ocet jablečný", cat: "ostatni" },
  { keyword: "vývar kuřecí", cat: "ostatni" },
  { keyword: "vývar hovězí", cat: "ostatni" },
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
      if (bi < batches.length - 1) await sleep(3000);
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
