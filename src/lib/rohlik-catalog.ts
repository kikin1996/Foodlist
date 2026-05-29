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

// Klíčové kategorie pro jídelníček — hledáme základní suroviny
const CATEGORY_QUERIES = [
  { keyword: "kuřecí prsa", cat: "maso" },
  { keyword: "vepřová krkovice", cat: "maso" },
  { keyword: "losos filet", cat: "maso" },
  { keyword: "mleté maso", cat: "maso" },
  { keyword: "vejce", cat: "mlecne" },
  { keyword: "mléko", cat: "mlecne" },
  { keyword: "máslo", cat: "mlecne" },
  { keyword: "smetana", cat: "mlecne" },
  { keyword: "tvrdý sýr", cat: "mlecne" },
  { keyword: "rajčata", cat: "zelenina" },
  { keyword: "paprika", cat: "zelenina" },
  { keyword: "cibule", cat: "zelenina" },
  { keyword: "česnek", cat: "zelenina" },
  { keyword: "brambory", cat: "zelenina" },
  { keyword: "mrkev", cat: "zelenina" },
  { keyword: "brokolice", cat: "zelenina" },
  { keyword: "špenát", cat: "zelenina" },
  { keyword: "cuketa", cat: "zelenina" },
  { keyword: "banán", cat: "ovoce" },
  { keyword: "jablko", cat: "ovoce" },
  { keyword: "pomeranč", cat: "ovoce" },
  { keyword: "těstoviny", cat: "suche" },
  { keyword: "rýže", cat: "suche" },
  { keyword: "ovesné vločky", cat: "suche" },
  { keyword: "chléb", cat: "pecivo" },
  { keyword: "rohlík", cat: "pecivo" },
  { keyword: "olivový olej", cat: "ostatni" },
  { keyword: "konzerva rajčata", cat: "ostatni" },
];

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

  try {
    // Hledej po 4 najednou (batch limit)
    const batches: typeof CATEGORY_QUERIES[] = [];
    for (let i = 0; i < CATEGORY_QUERIES.length; i += 4) {
      batches.push(CATEGORY_QUERIES.slice(i, i + 4));
    }

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
          const best = prods.filter((p: { inStock: boolean }) => p.inStock).slice(0, 3);
          for (const p of best) {
            products.push({
              id: p.productId,
              name: p.productName,
              price: p.price,
              amount: p.textualAmount ?? "",
              category: batch[i].cat,
            });
          }
        }
      } catch {
        // Pokračuj i při chybě jedné dávky
      }
      if (bi < batches.length - 1) await sleep(3000);
    }
  } finally {
    await client.close();
  }

  return products;
}

export function catalogToContext(products: CatalogProduct[]): string {
  const byCat: Record<string, CatalogProduct[]> = {};
  for (const p of products) {
    (byCat[p.category] ??= []).push(p);
  }

  return Object.entries(byCat)
    .map(([cat, items]) =>
      `${cat}: ${items.map((p) => `${p.name}(${p.amount},${p.price}Kč)`).join(", ")}`
    )
    .join("\n");
}
