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

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

// Vyhledá jednu dávku s retry
async function searchBatch(
  client: Client,
  keywords: string[]
): Promise<Record<string, RohlikProduct[]>> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const queries = keywords.map((k) => ({ keyword: k }));
      const result = await client.callTool({ name: "batch_search_products", arguments: { queries } });
      const data = JSON.parse((result.content as { type: string; text: string }[])[0].text);
      const map: Record<string, RohlikProduct[]> = {};
      for (const r of data.results ?? []) {
        map[r.query.keyword] = (r.products ?? [])
          .filter((p: RohlikProduct) => p.inStock)
          .slice(0, 3);
      }
      return map;
    } catch (err) {
      const msg = String(err);
      if ((msg.includes("1015") || msg.includes("rate_limit") || msg.includes("429")) && attempt < 3) {
        console.log(`Rate limit, čekám ${(attempt + 1) * 35}s...`);
        await sleep((attempt + 1) * 35000);
        continue;
      }
      console.error("Search batch error:", msg.slice(0, 100));
      return {};
    }
  }
  return {};
}

export async function fillRohlikCart(
  shoppingList: ShoppingItem[],
  rohlikEmail: string,
  rohlikPassword: string,
  householdSize: number
): Promise<RohlikCartResult> {
  const mcpClient = await createRohlikClient(rohlikEmail, rohlikPassword);

  try {
    // ── FÁZE 1: Paralelní vyhledávání (skupiny po 3 dávky najednou) ──
    const batches = chunk(shoppingList, 4); // 4 položky per dávka
    const allResults: Record<string, RohlikProduct[]> = {};

    console.log(`Vyhledávám ${shoppingList.length} položek v ${batches.length} dávkách`);

    const batchGroups = chunk(batches, 3); // 3 dávky paralelně = 12 položek najednou
    for (let gi = 0; gi < batchGroups.length; gi++) {
      const group = batchGroups[gi];
      const results = await Promise.all(
        group.map((batch) => searchBatch(mcpClient, batch.map((i) => i.name)))
      );
      results.forEach((r) => Object.assign(allResults, r));
      console.log(`Skupina ${gi + 1}/${batchGroups.length} hotová`);
      if (gi < batchGroups.length - 1) await sleep(4000); // 4s mezi skupinami
    }

    // ── FÁZE 2: Jeden Claude call — výběr nejlepšího produktu pro každou položku ──
    const itemsWithResults = shoppingList.map((item) => ({
      item,
      products: allResults[item.name] ?? [],
    }));

    const prompt = itemsWithResults.map(({ item, products }) => {
      if (products.length === 0) return `${item.name}: NENALEZENO`;
      const opts = products.map((p, i) =>
        `${i}:id=${p.productId},"${p.productName}",${p.price}Kč,${p.textualAmount ?? ""}`
      ).join("|");
      return `${item.name}(${item.amount}${item.unit}):[${opts}]`;
    }).join("\n");

    const claudeResp = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: `Vyber nejlepší produkt pro každou položku (správná gramáž, nejnižší cena). Vrať POUZE JSON:\n[{"n":"název položky","id":123}]\nPro nenalezené použij id:null.\n\n${prompt}`,
      }],
    });

    const claudeText = (claudeResp.content[0] as Anthropic.TextBlock).text;
    const match = claudeText.match(/\[[\s\S]*?\]/);
    const selections: { n: string; id: number | null }[] = match ? JSON.parse(match[0]) : [];

    // ── FÁZE 3: Jedno hromadné přidání do košíku ──
    const toAdd: { productId: number; quantity: number }[] = [];
    const addedItems: RohlikCartResult["addedItems"] = [];
    const notFoundItems: string[] = [];

    for (const { item, products } of itemsWithResults) {
      const sel = selections.find((s) => s.n === item.name);
      if (!sel?.id) { notFoundItems.push(item.name); continue; }
      const product = products.find((p) => p.productId === sel.id);
      if (!product) { notFoundItems.push(item.name); continue; }

      const qty = Math.max(1, Math.round(
        item.unit === "kg" ? parseFloat(item.amount) :
        item.unit === "g" ? Math.ceil(parseFloat(item.amount) / 500) : 1
      ));
      toAdd.push({ productId: product.productId, quantity: qty });
      addedItems.push({
        name: item.name,
        rohlikName: product.productName,
        price: product.price * qty,
        amount: product.textualAmount ?? `${item.amount}${item.unit}`,
      });
    }

    if (toAdd.length > 0) {
      // Přidej ve skupinách po 20 (Rohlik limit)
      const addChunks = chunk(toAdd, 20);
      for (let i = 0; i < addChunks.length; i++) {
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            await mcpClient.callTool({ name: "add_items_to_cart", arguments: { items: addChunks[i] } });
            break;
          } catch (err) {
            const msg = String(err);
            if ((msg.includes("1015") || msg.includes("rate_limit")) && attempt < 3) {
              await sleep((attempt + 1) * 35000);
              continue;
            }
            break;
          }
        }
        if (i < addChunks.length - 1) await sleep(3000);
      }
    }

    const estimatedTotal = addedItems.reduce((s, i) => s + i.price, 0);
    console.log(`Přidáno: ${addedItems.length}/${shoppingList.length}, nenalezeno: ${notFoundItems.length}`);

    return { addedItems, notFoundItems, estimatedTotal, cartUrl: "https://www.rohlik.cz" };
  } finally {
    await mcpClient.close();
  }
}
