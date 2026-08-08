import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ShoppingItem } from "./meal-planner";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

export function isRohlikAuthError(err: unknown): boolean {
  const msg = String(err);
  return msg.includes("Login request failed") || msg.includes("401") || msg.includes("Unauthorized");
}

/** Ověří Rohlík přihlašovací údaje — vrátí null při úspěchu, jinak text chyby. */
export async function verifyRohlikCredentials(email: string, password: string): Promise<string | null> {
  let client: Client | null = null;
  try {
    client = await createRohlikClient(email, password);
    const r = await client.callTool({ name: "get_user_info", arguments: {} });
    const text = (r.content as { type: string; text: string }[])[0]?.text ?? "";
    if (text.includes("Login request failed") || text.includes("Unauthorized")) {
      return "Rohlík odmítl přihlášení — zkontrolujte email a heslo.";
    }
    return null;
  } catch (err) {
    if (isRohlikAuthError(err)) return "Rohlík odmítl přihlášení — zkontrolujte email a heslo.";
    return `Rohlík je dočasně nedostupný (${String(err).slice(0, 80)})`;
  } finally {
    await client?.close().catch(() => {});
  }
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
  for (let attempt = 0; attempt < 3; attempt++) {
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
      if ((msg.includes("1015") || msg.includes("rate_limit") || msg.includes("429")) && attempt < 2) {
        console.log(`Rate limit, čekám ${(attempt + 1) * 15}s...`);
        await sleep((attempt + 1) * 15000);
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
  _householdSize: number
): Promise<RohlikCartResult> {
  const mcpClient = await createRohlikClient(rohlikEmail, rohlikPassword);

  try {
    // ── FÁZE 0: Ověř přihlášení a vyčisti košík ──
    // MCP vrací chyby jako text v odpovědi, ne jako výjimku — kontrolujeme obojí
    try {
      const authCheck = await mcpClient.callTool({ name: "get_user_info", arguments: {} });
      const authText = (authCheck.content as { type: string; text: string }[])[0]?.text ?? "";
      if (authText.includes("Login request failed") || authText.includes("Unauthorized")) {
        throw new Error("Rohlík odmítl přihlášení — zkontrolujte email a heslo v Nastavení.");
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("Rohlík odmítl")) throw e;
      if (isRohlikAuthError(e)) {
        throw new Error("Rohlík odmítl přihlášení — zkontrolujte email a heslo v Nastavení.");
      }
      console.warn("Ověření přihlášení selhalo:", String(e).slice(0, 100));
    }

    try {
      await mcpClient.callTool({ name: "clear_cart", arguments: {} });
      console.log("Košík vyčištěn");
      await sleep(1000);
    } catch (e) {
      console.warn("clear_cart selhalo:", String(e).slice(0, 100));
    }

    // ── FÁZE 1: Vyhledávání ──
    // Zjednodušíme názvy pro lepší shodu na Rohlíku
    function simplifyName(name: string): string {
      return name
        .trim()
        .replace(/\s*\d+\s*(g|kg|ml|l|ks)\s*/gi, "") // odstraň gramáže v názvu
        .replace(/\s+pro\s+\d+\s*osob.*/i, "")        // odstraň "pro X osob"
        .replace(/\s+balení.*/i, "")                   // odstraň "balení..."
        .trim()
        .split(/\s+/).slice(0, 3).join(" ");            // max 3 slova
    }

    // Mapa: originalní název → klíč pro vyhledávání
    const searchKeyMap: Record<string, string> = {};
    for (const item of shoppingList) {
      searchKeyMap[item.name] = simplifyName(item.name);
    }

    const allResults: Record<string, RohlikProduct[]> = {};
    const batches = chunk(shoppingList, 6);
    console.log(`Vyhledávám ${shoppingList.length} položek (${batches.length} dávek)`);
    console.log("Klíče:", Object.values(searchKeyMap).join(", "));

    // Časový rozpočet: po 180s přestaň hledat, ať funkce stihne odpovědět
    const searchDeadline = Date.now() + 180_000;
    const batchGroups = chunk(batches, 2);
    for (let gi = 0; gi < batchGroups.length; gi++) {
      if (Date.now() > searchDeadline) {
        console.warn(`Časový limit vyhledávání — přeskakuji zbylých ${batchGroups.length - gi} skupin`);
        break;
      }
      const group = batchGroups[gi];
      const results = await Promise.all(
        group.map((batch) =>
          searchBatch(mcpClient, batch.map((i) => searchKeyMap[i.name]))
        )
      );
      results.forEach((r) => Object.assign(allResults, r));
      if (gi < batchGroups.length - 1) await sleep(2000);
    }

    // ── FÁZE 2: Výběr nejlepšího produktu ──
    const itemsWithResults = shoppingList.map((item) => {
      const key = searchKeyMap[item.name];
      const products = allResults[key] ?? [];
      if (products.length === 0) {
        console.log(`Nenalezeno: "${item.name}" (hledáno jako "${key}")`);
      }
      return { item, products, searchKey: key };
    });

    const prompt = itemsWithResults.map(({ item, products }) => {
      if (products.length === 0) return `${item.name}: NENALEZENO`;
      const opts = products.map((p, i) =>
        `${i}:id=${p.productId},"${p.productName}",${p.price}Kč,${p.textualAmount ?? ""}`
      ).join("|");
      return `${item.name}(${item.amount}${item.unit}):[${opts}]`;
    }).join("\n");

    console.log("Prompt pro Claude:\n" + prompt.slice(0, 800));

    const aiResp = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 4096,
      reasoning_effort: "low",
      messages: [{
        role: "user",
        content: `Vyber nejlepší produkt pro každou položku (správná gramáž, nejnižší cena). Vrať POUZE JSON pole:\n[{"n":"název položky","id":123}]\nPro nenalezené použij id:null.\n\n${prompt}`,
      }],
    });

    const aiText = aiResp.choices[0]?.message?.content ?? "";
    console.log("AI výběr:", aiText.slice(0, 500));
    const match = aiText.match(/\[[\s\S]*\]/);
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
        let added = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const res = await mcpClient.callTool({ name: "add_items_to_cart", arguments: { items: addChunks[i] } });
            const resData = JSON.parse((res.content as { type: string; text: string }[])[0].text);
            console.log(`Chunk ${i + 1}: success=${resData.success}, failed=${JSON.stringify(resData.items_failed_to_add ?? [])}`);
            added = true;
            break;
          } catch (err) {
            const msg = String(err);
            console.error(`add_to_cart chunk ${i + 1} attempt ${attempt + 1} failed:`, msg.slice(0, 150));
            if ((msg.includes("1015") || msg.includes("rate_limit")) && attempt < 2) {
              await sleep((attempt + 1) * 15000);
              continue;
            }
            break;
          }
        }
        if (!added) console.error(`Chunk ${i + 1} se nepodařilo přidat ani po 3 pokusech`);
        if (i < addChunks.length - 1) await sleep(3000);
      }
    }

    // ── FÁZE 4: Ověření košíku ──
    await sleep(2000);
    let verifiedTotal = 0;
    let verifiedCount = 0;
    try {
      const cartResult = await mcpClient.callTool({ name: "get_cart", arguments: {} });
      const cartData = JSON.parse((cartResult.content as { type: string; text: string }[])[0].text);
      const cartItems = cartData?.data?.items ?? {};
      verifiedCount = Object.keys(cartItems).length;
      verifiedTotal = cartData?.data?.totalPrice ?? 0;
      console.log(`Ověření košíku: ${verifiedCount} produktů, celkem ${verifiedTotal} Kč`);

      if (verifiedCount === 0) {
        throw new Error(
          "Košík je prázdný — položky se nepodařilo přidat na Rohlík.cz. Zkontrolujte přihlašovací údaje v Nastavení."
        );
      }

      // Zkontroluj jestli jsou v košíku naše produkty (alespoň polovina)
      const cartProductIds = new Set(Object.keys(cartItems).map(Number));
      const ourProductIds = toAdd.map((t) => t.productId);
      const matched = ourProductIds.filter((id) => cartProductIds.has(id)).length;
      console.log(`Shoda produktů: ${matched}/${ourProductIds.length}`);

      if (matched === 0 && ourProductIds.length > 0) {
        throw new Error(
          "Košík neobsahuje žádné z požadovaných položek. Zkuste to znovu nebo zkontrolujte přihlašovací údaje."
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Košík je prázdný") || msg.includes("neobsahuje")) throw err;
      console.warn("Ověření košíku selhalo:", msg.slice(0, 100));
    }

    const estimatedTotal = verifiedTotal > 0
      ? verifiedTotal
      : addedItems.reduce((s, i) => s + i.price, 0);

    console.log(`Přidáno: ${addedItems.length}/${shoppingList.length}, ověřeno v košíku: ${verifiedCount}`);

    return { addedItems, notFoundItems, estimatedTotal, cartUrl: "https://www.rohlik.cz" };
  } finally {
    await mcpClient.close();
  }
}
