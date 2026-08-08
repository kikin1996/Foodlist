import OpenAI from "openai";
import { RohlikClient, RohlikRateLimitError, type RohlikProduct } from "./rohlik-client";
import type { ShoppingItem } from "./meal-planner";
import type { CatalogProduct } from "./rohlik-catalog";

export { verifyRohlikCredentials } from "./rohlik-client";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RohlikCartResult {
  addedItems: { name: string; rohlikName: string; price: number; amount: string }[];
  notFoundItems: string[];
  estimatedTotal: number;
  cartUrl: string;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

function simplifyName(name: string): string {
  return name
    .trim()
    .replace(/\s*\d+\s*(g|kg|ml|l|ks)\s*/gi, "") // odstraň gramáže v názvu
    .replace(/\s+pro\s+\d+\s*osob.*/i, "")        // odstraň "pro X osob"
    .replace(/\s+balení.*/i, "")                   // odstraň "balení..."
    .trim()
    .split(/\s+/).slice(0, 3).join(" ");            // max 3 slova
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function significantWords(s: string): string[] {
  return normalizeForMatch(s).split(/\s+/).filter((w) => w.length > 2);
}

// Fuzzy shoda na prvních znacích slova — obejde české skloňování
// (rajče/rajčata, cibule/cibulí) bez potřeby závislosti na plné morfologii.
function wordsRoughlyMatch(a: string, b: string): boolean {
  const len = Math.min(a.length, b.length, 4);
  return a.slice(0, len) === b.slice(0, len);
}

/** Zkusí najít položku v už staženém katalogu (z generování jídelníčku), aby appka
 * nemusela pro každou položku dělat živý dotaz na Rohlík — to je hlavní zdroj
 * rate-limitu při větších nákupních seznamech. */
function lookupInCatalog(catalog: CatalogProduct[] | undefined, key: string): RohlikProduct[] {
  if (!catalog || catalog.length === 0) return [];
  const keyWords = significantWords(key);
  if (keyWords.length === 0) return [];
  const matches = catalog.filter((p) => {
    const productWords = significantWords(p.name);
    return keyWords.every((kw) => productWords.some((pw) => wordsRoughlyMatch(kw, pw)));
  });
  return matches.slice(0, 3).map((p) => ({
    productId: p.id,
    productName: p.name,
    price: p.price,
    textualAmount: p.amount,
    inStock: true,
  }));
}

function computeQty(item: ShoppingItem): number {
  return Math.max(1, Math.round(
    item.unit === "kg" ? parseFloat(item.amount) :
    item.unit === "g" ? Math.ceil(parseFloat(item.amount) / 500) : 1
  ));
}

export async function fillRohlikCart(
  shoppingList: ShoppingItem[],
  rohlikEmail: string,
  rohlikPassword: string,
  _householdSize: number,
  catalog?: CatalogProduct[]
): Promise<RohlikCartResult> {
  const client = new RohlikClient();
  await client.login(rohlikEmail, rohlikPassword);

  // ── FÁZE 0: Vyčisti košík ──
  await client.clearCart();
  console.log("Košík vyčištěn");

  const toAdd: { productId: number; quantity: number }[] = [];
  const addedItems: RohlikCartResult["addedItems"] = [];
  const notFoundItems: string[] = [];

  // Položky, které AI už při generování jídelníčku vybrala přímo z katalogu
  // (mají rohlikId), jdou rovnou do košíku — bez dalšího vyhledávání na Rohlíku.
  // To je hlavní obrana proti rate limitu: dřív appka hledala živě úplně
  // všechno (60+ dotazů na objednávku), teď typicky jen malý zbytek.
  const preResolved = shoppingList.filter((i) => i.rohlikId != null);
  const needsResolution = shoppingList.filter((i) => i.rohlikId == null);

  for (const item of preResolved) {
    const qty = computeQty(item);
    toAdd.push({ productId: item.rohlikId!, quantity: qty });
    addedItems.push({
      name: item.name,
      rohlikName: item.rohlikName ?? item.name,
      price: (item.rohlikPrice ?? 0) * qty,
      amount: `${item.amount}${item.unit}`,
    });
  }

  console.log(
    `Předvybráno z katalogu: ${preResolved.length}/${shoppingList.length}, dohledávám: ${needsResolution.length}`
  );

  // ── FÁZE 1: Dohledání zbytku (katalog fuzzy-match, pak živé vyhledávání) ──
  const searchKeyMap: Record<string, string> = {};
  for (const item of needsResolution) {
    searchKeyMap[item.name] = simplifyName(item.name);
  }

  const allResults: Record<string, RohlikProduct[]> = {};
  const needsLiveSearch: ShoppingItem[] = [];
  for (const item of needsResolution) {
    const key = searchKeyMap[item.name];
    const cached = lookupInCatalog(catalog, key);
    if (cached.length > 0) {
      allResults[key] = cached;
    } else {
      needsLiveSearch.push(item);
    }
  }

  if (needsResolution.length > 0) {
    console.log(
      `Z katalogu (fuzzy): ${needsResolution.length - needsLiveSearch.length}/${needsResolution.length}, živě hledám: ${needsLiveSearch.length}`
    );
  }

  const searchGroups = chunk(needsLiveSearch, 3);
  for (let gi = 0; gi < searchGroups.length; gi++) {
    const results = await Promise.all(
      searchGroups[gi].map(async (item) => {
        const key = searchKeyMap[item.name];
        try {
          return { key, products: (await client.searchProducts(key)).slice(0, 3) };
        } catch (e) {
          if (e instanceof RohlikRateLimitError) throw e;
          console.warn(`Vyhledání "${key}" selhalo:`, String(e).slice(0, 100));
          return { key, products: [] as RohlikProduct[] };
        }
      })
    );
    for (const r of results) allResults[r.key] = r.products;
    if (gi < searchGroups.length - 1) await sleep(300);
  }

  // ── FÁZE 2: Výběr nejlepšího produktu přes AI (jen pro dohledávané položky) ──
  const itemsWithResults = needsResolution.map((item) => {
    const key = searchKeyMap[item.name];
    const products = allResults[key] ?? [];
    if (products.length === 0) {
      console.log(`Nenalezeno: "${item.name}" (hledáno jako "${key}")`);
    }
    return { item, products };
  });

  if (itemsWithResults.some(({ products }) => products.length > 0)) {
    // Položky číslujeme indexem — AI odpověď se pak páruje podle indexu, ne podle
    // textu jména (to je nespolehlivé, model název občas přeformuluje nebo k němu
    // připojí gramáž a přesná shoda stringů selže i u správně vybraného produktu).
    const prompt = itemsWithResults.map(({ item, products }, i) => {
      if (products.length === 0) return `${i}) ${item.name}: NENALEZENO`;
      const opts = products.map((p, oi) =>
        `${oi}:id=${p.productId},"${p.productName}",${p.price}Kč,${p.textualAmount ?? ""}`
      ).join("|");
      return `${i}) ${item.name}(${item.amount}${item.unit}):[${opts}]`;
    }).join("\n");

    console.log("Prompt pro AI:\n" + prompt.slice(0, 800));

    const aiResp = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 4096,
      reasoning_effort: "low",
      messages: [{
        role: "user",
        content: `Vyber nejlepší produkt pro každou položku (správná gramáž, nejnižší cena). Vrať POUZE JSON pole se stejným počtem prvků, seřazené podle indexu položky:\n[{"i":0,"id":123}]\ni = index položky (číslo před závorkou), id = id vybraného produktu. Pro nenalezené použij id:null.\n\n${prompt}`,
      }],
    });

    const aiText = aiResp.choices[0]?.message?.content ?? "";
    console.log("AI výběr:", aiText.slice(0, 500));
    const match = aiText.match(/\[[\s\S]*\]/);
    const selections: { i: number; id: number | null }[] = match ? JSON.parse(match[0]) : [];

    for (let i = 0; i < itemsWithResults.length; i++) {
      const { item, products } = itemsWithResults[i];
      const sel = selections.find((s) => s.i === i);
      if (!sel?.id) { notFoundItems.push(item.name); continue; }
      const product = products.find((p) => p.productId === sel.id);
      if (!product) { notFoundItems.push(item.name); continue; }

      const qty = computeQty(item);
      toAdd.push({ productId: product.productId, quantity: qty });
      addedItems.push({
        name: item.name,
        rohlikName: product.productName,
        price: product.price * qty,
        amount: product.textualAmount ?? `${item.amount}${item.unit}`,
      });
    }
  } else {
    for (const { item } of itemsWithResults) notFoundItems.push(item.name);
  }

  // Krátká pauza po náporu vyhledávání, ať se Rohlíkův rate limit stihne uvolnit
  // před zápisovými požadavky (retry s backoffem je navíc v RohlikClient).
  if (needsLiveSearch.length > 0) await sleep(2000);

  const failedToAdd = new Set<number>();
  const addGroups = chunk(toAdd, 3);
  for (let gi = 0; gi < addGroups.length; gi++) {
    const results = await Promise.all(
      addGroups[gi].map((t) => client.addToCart(t.productId, t.quantity).then((ok) => ({ ...t, ok })))
    );
    for (const r of results) if (!r.ok) failedToAdd.add(r.productId);
    if (gi < addGroups.length - 1) await sleep(300);
  }

  const finalAdded = addedItems.filter((_, i) => !failedToAdd.has(toAdd[i].productId));
  const finalNotFound = [
    ...notFoundItems,
    ...addedItems.filter((_, i) => failedToAdd.has(toAdd[i].productId)).map((a) => a.name),
  ];

  // ── FÁZE 4: Ověření košíku ──
  await sleep(1000);
  let verifiedTotal = 0;
  let verifiedCount = 0;
  try {
    const cart = await client.getCart();
    verifiedCount = Object.keys(cart.items).length;
    verifiedTotal = cart.totalPrice;
    console.log(`Ověření košíku: ${verifiedCount} produktů, celkem ${verifiedTotal} Kč`);

    if (verifiedCount === 0 && toAdd.length > 0) {
      throw new Error(
        "Košík je prázdný — položky se nepodařilo přidat na Rohlík.cz. Zkuste to znovu."
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Košík je prázdný")) throw err;
    console.warn("Ověření košíku selhalo:", msg.slice(0, 100));
  }

  const estimatedTotal = verifiedTotal > 0
    ? verifiedTotal
    : finalAdded.reduce((s, i) => s + i.price, 0);

  console.log(`Přidáno: ${finalAdded.length}/${shoppingList.length}, ověřeno v košíku: ${verifiedCount}`);

  return { addedItems: finalAdded, notFoundItems: finalNotFound, estimatedTotal, cartUrl: "https://www.rohlik.cz" };
}
