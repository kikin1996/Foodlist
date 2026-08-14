// Přímý klient na veřejné Rohlík API (www.rohlik.cz) — nahrazuje nespolehlivý mcp.rohlik.cz.
//
// Používá undici napřímo, ne globální `fetch` — Next.js si globální fetch v Route
// Handlerech patchuje pro svůj Data Cache a v této obálce se ztrácely opakované
// Set-Cookie hlavičky (getSetCookie() vracelo prázdno), takže se session cookie
// nikdy neuložila a každý další request (add/get cart) běžel jako anonymní
// bez přihlášení — proto košík po objednávce vypadal prázdný i po úspěšném loginu.
import { fetch, type Response } from "undici";

const BASE = "https://www.rohlik.cz/services/frontend-service";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

export interface RohlikProduct {
  productId: number;
  productName: string;
  price: number;
  textualAmount?: string;
  inStock: boolean;
}

export class RohlikAuthError extends Error {}
export class RohlikRateLimitError extends Error {}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export class RohlikClient {
  private cookie = "";
  // Krátký nápor 429 je normální a stačí pár vteřin čekání. Pokud ale i po
  // pár po sobě jdoucích požadavcích (s odstupem) dál chodí 429, jde o delší
  // blokádu celé IP/účtu — v tom případě je lepší se rychle vzdát a nechat
  // uživatele zkusit znovu za chvíli, než dál bušit do API a blokádu prodlužovat.
  private consecutive429 = 0;
  private readonly rateLimitThreshold = 4;

  private async fetchWithRetry(stage: string, url: string, init: Parameters<typeof fetch>[1], retries = 1): Promise<Response> {
    if (this.consecutive429 >= this.rateLimitThreshold) {
      throw new RohlikRateLimitError(
        `Rohlík momentálně omezuje počet požadavků (fáze: ${stage}) — zkuste to znovu za pár minut.`
      );
    }
    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(url, init);
      if (res.status !== 429) {
        this.consecutive429 = 0;
        return res;
      }
      this.consecutive429++;
      if (this.consecutive429 >= this.rateLimitThreshold) {
        console.warn(`Rohlík rate limit trvalý (${this.consecutive429}x za sebou, fáze: ${stage}) — vzdávám se dalších pokusů.`);
        throw new RohlikRateLimitError(
          `Rohlík momentálně omezuje počet požadavků (fáze: ${stage}, ${this.consecutive429}x 429 za sebou) — zkuste to znovu za pár minut.`
        );
      }
      if (attempt === retries) return res;
      console.warn(`Rohlík 429 na ${url.split("?")[0]} (fáze: ${stage}), čekám 3000ms (pokus ${attempt + 1}/${retries})`);
      await sleep(3000);
    }
    throw new Error("unreachable");
  }

  async login(email: string, password: string): Promise<void> {
    const res = await this.fetchWithRetry("login", `${BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ email, password }),
    });
    if (res.status === 429) {
      throw new RohlikRateLimitError("Rohlík momentálně omezuje počet požadavků (fáze: login) — zkuste to znovu za pár minut.");
    }
    const data = (await res.json().catch(() => null)) as { status?: number; data?: { user?: unknown } } | null;
    if (!res.ok || data?.status !== 200 || !data?.data?.user) {
      throw new RohlikAuthError("Rohlík odmítl přihlášení — zkontrolujte email a heslo v Nastavení.");
    }
    const setCookies = res.headers.getSetCookie();
    this.cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
    if (!this.cookie) {
      throw new Error("Rohlík login OK, ale nepřišla session cookie — zkuste to znovu.");
    }
  }

  private headers(): Record<string, string> {
    return { Cookie: this.cookie, "User-Agent": UA, "Content-Type": "application/json" };
  }

  async searchProducts(keyword: string): Promise<RohlikProduct[]> {
    const res = await this.fetchWithRetry(
      "search",
      `${BASE}/search-metadata?search=${encodeURIComponent(keyword)}&companyId=1`,
      { headers: this.headers() }
    );
    if (!res.ok) return [];
    type SearchProduct = { productId: number; productName: string; price: { full: number }; textualAmount?: string; inStock?: boolean };
    const data = (await res.json().catch(() => null)) as { data?: { productList?: SearchProduct[] } } | null;
    const list = data?.data?.productList ?? [];
    return list
      .filter((p) => p.inStock !== false)
      .map((p) => ({
        productId: p.productId,
        productName: p.productName,
        price: p.price?.full ?? 0,
        textualAmount: p.textualAmount,
        inStock: true,
      }));
  }

  async clearCart(): Promise<void> {
    await this.fetchWithRetry("clearCart", `${BASE}/v2/cart?clear=true`, { method: "DELETE", headers: this.headers() });
  }

  async addToCart(productId: number, quantity: number): Promise<boolean> {
    const res = await this.fetchWithRetry("addToCart", `${BASE}/v2/cart`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ productId, quantity }),
    });
    const text = await res.text();
    let data: { status?: number } | null = null;
    try { data = JSON.parse(text); } catch { /* not JSON */ }
    const ok = res.ok && data?.status === 200;
    if (!ok) {
      console.warn(
        `addToCart(${productId}) FAIL — HTTP ${res.status}, content-type=${res.headers.get("content-type")}, body: ${text.slice(0, 300)}`
      );
    }
    return ok;
  }

  async getCart(): Promise<{ items: Record<string, unknown>; totalPrice: number }> {
    const res = await this.fetchWithRetry("getCart", `${BASE}/v2/cart`, { headers: this.headers() });
    const text = await res.text();
    let data: { data?: { items?: Record<string, unknown>; totalPrice?: number } } | null = null;
    try { data = JSON.parse(text); } catch { /* not JSON */ }
    if (!res.ok || !data) {
      console.warn(`getCart FAIL — HTTP ${res.status}, body: ${text.slice(0, 300)}`);
    }
    return { items: data?.data?.items ?? {}, totalPrice: data?.data?.totalPrice ?? 0 };
  }
}

export async function verifyRohlikCredentials(email: string, password: string): Promise<string | null> {
  try {
    await new RohlikClient().login(email, password);
    return null;
  } catch (err) {
    if (err instanceof RohlikAuthError) return err.message;
    return `Rohlík je dočasně nedostupný (${String(err).slice(0, 80)})`;
  }
}
