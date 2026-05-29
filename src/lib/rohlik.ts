import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ShoppingItem } from "./meal-planner";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const ROHLIK_MCP_URL = "https://mcp.rohlik.cz/mcp";

export interface RohlikCartResult {
  addedItems: { name: string; rohlikName: string; price: number; amount: string }[];
  notFoundItems: string[];
  estimatedTotal: number;
  cartUrl: string;
}

interface RohlikProduct {
  productId: number;
  productName: string;
  price: number;
  pricePerUnit?: { full: number };
  textualAmount?: string;
  inStock: boolean;
}

async function createRohlikClient(email: string, password: string): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(ROHLIK_MCP_URL), {
    requestInit: { headers: { "rhl-email": email, "rhl-pass": password } },
  });
  const client = new Client({ name: "kostki", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Rozdělí pole na dávky
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// Vyhledá dávku položek přes MCP (bez Claude)
async function searchBatch(client: Client, keywords: string[]): Promise<Record<string, RohlikProduct[]>> {
  const queries = keywords.map((k) => ({ keyword: k }));
  const result = await client.callTool({ name: "batch_search_products", arguments: { queries } });
  const data = JSON.parse((result.content as { type: string; text: string }[])[0].text);
  const map: Record<string, RohlikProduct[]> = {};
  for (const r of data.results ?? []) {
    map[r.query.keyword] = (r.products ?? []).filter((p: RohlikProduct) => p.inStock).slice(0, 5);
  }
  return map;
}

// Claude vybere nejlepší produkt z výsledků (jedna call pro celou dávku)
async function selectBestProducts(
  items: ShoppingItem[],
  searchResults: Record<string, RohlikProduct[]>,
  householdSize: number
): Promise<{ item: ShoppingItem; product: RohlikProduct | null }[]> {
  const prompt = items.map((item) => {
    const results = searchResults[item.name] ?? [];
    if (results.length === 0) return `"${item.name}": NENALEZENO`;
    const opts = results.map((p, i) => `  ${i}: id=${p.productId} "${p.productName}" ${p.price}Kč ${p.textualAmount ?? ""}`).join("\n");
    return `"${item.name}" (potřeba: ${item.amount}${item.unit} pro ${householdSize} osob):\n${opts}`;
  }).join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Pro každou položku vyber nejlepší produkt (správná gramáž, rozumná cena). Vrať POUZE JSON pole:\n[{"name":"název položky","productId":123}]\nPokud nenalezeno, použij productId: null.\n\n${prompt}`,
    }],
  });

  const text = (response.content[0] as Anthropic.TextBlock).text;
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return items.map((item) => ({ item, product: null }));

  const selections: { name: string; productId: number | null }[] = JSON.parse(match[0]);

  return items.map((item) => {
    const sel = selections.find((s) => s.name === item.name);
    if (!sel?.productId) return { item, product: null };
    const allProducts = Object.values(searchResults).flat();
    const product = allProducts.find((p) => p.productId === sel.productId) ?? null;
    return { item, product };
  });
}

export async function fillRohlikCart(
  shoppingList: ShoppingItem[],
  rohlikEmail: string,
  rohlikPassword: string,
  householdSize: number
): Promise<RohlikCartResult> {
  const mcpClient = await createRohlikClient(rohlikEmail, rohlikPassword);

  const addedItems: RohlikCartResult["addedItems"] = [];
  const notFoundItems: string[] = [];

  try {
    // Zpracuj v dávkách po 4 (limit batch_search_products)
    const batches = chunk(shoppingList, 4);
    console.log(`Zpracovávám ${shoppingList.length} položek v ${batches.length} dávkách`);

    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi];
      console.log(`Dávka ${bi + 1}/${batches.length}: ${batch.map((i) => i.name).join(", ")}`);

      // 1. Vyhledej přes MCP
      const searchResults = await searchBatch(mcpClient, batch.map((i) => i.name));

      // 2. Claude vybere nejlepší produkty
      const selections = await selectBestProducts(batch, searchResults, householdSize);

      // 3. Přidej nalezené do košíku
      const toAdd = selections.filter((s) => s.product !== null);
      const notFound = selections.filter((s) => s.product === null);

      notFoundItems.push(...notFound.map((s) => s.item.name));

      if (toAdd.length > 0) {
        const items = toAdd.map((s) => ({
          productId: s.product!.productId,
          quantity: Math.max(1, Math.round(
            // Odhadni množství podle gramáže
            s.item.unit === "kg" ? parseFloat(s.item.amount) :
            s.item.unit === "g" ? parseFloat(s.item.amount) / 1000 : 1
          )),
        }));

        const addResult = await mcpClient.callTool({
          name: "add_items_to_cart",
          arguments: { items },
        });
        const addData = JSON.parse((addResult.content as { type: string; text: string }[])[0].text);

        for (const s of toAdd) {
          const failed = (addData.items_failed_to_add ?? []).includes(String(s.product!.productId));
          if (failed) {
            notFoundItems.push(s.item.name);
          } else {
            addedItems.push({
              name: s.item.name,
              rohlikName: s.product!.productName,
              price: s.product!.price,
              amount: s.product!.textualAmount ?? `${s.item.amount}${s.item.unit}`,
            });
          }
        }
      }

      // Počkej mezi dávkami aby nedošlo k rate limitu
      if (bi < batches.length - 1) await sleep(2000);
    }

    const estimatedTotal = addedItems.reduce((sum, i) => sum + i.price, 0);
    console.log(`Hotovo: přidáno ${addedItems.length}/${shoppingList.length}, nenalezeno ${notFoundItems.length}`);

    return {
      addedItems,
      notFoundItems,
      estimatedTotal,
      cartUrl: "https://www.rohlik.cz",
    };
  } finally {
    await mcpClient.close();
  }
}
