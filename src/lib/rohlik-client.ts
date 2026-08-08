// Přímý klient na veřejné Rohlík API (www.rohlik.cz) — nahrazuje nespolehlivý mcp.rohlik.cz.
//
// Používá undici napřímo, ne globální `fetch` — Next.js si globální fetch v Route
// Handlerech patchuje pro svůj Data Cache a v této obálce se ztrácely opakované
// Set-Cookie hlavičky (getSetCookie() vracelo prázdno), takže se session cookie
// nikdy neuložila a každý další request (add/get cart) běžel jako anonymní
// bez přihlášení — proto košík po objednávce vypadal prázdný i po úspěšném loginu.
import { fetch } from "undici";

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

export class RohlikClient {
  private cookie = "";

  async login(email: string, password: string): Promise<void> {
    const res = await fetch(`${BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json().catch(() => null)) as { status?: number; data?: { user?: unknown } } | null;
    if (!res.ok || data?.status !== 200 || !data?.data?.user) {
      throw new RohlikAuthError("Rohlík odmítl přihlášení — zkontrolujte email a heslo v Nastavení.");
    }
    const setCookies = res.headers.getSetCookie();
    this.cookie = setCookies.map((c) => c.split(";")[0]).join("; ");
    console.log(`Rohlík login OK, Set-Cookie count=${setCookies.length}, cookie length=${this.cookie.length}`);
    if (!this.cookie) {
      throw new Error("Rohlík login OK, ale nepřišla session cookie — zkuste to znovu.");
    }
  }

  private headers(): Record<string, string> {
    return { Cookie: this.cookie, "User-Agent": UA, "Content-Type": "application/json" };
  }

  async searchProducts(keyword: string): Promise<RohlikProduct[]> {
    const res = await fetch(
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
    await fetch(`${BASE}/v2/cart?clear=true`, { method: "DELETE", headers: this.headers() });
  }

  async addToCart(productId: number, quantity: number): Promise<boolean> {
    const res = await fetch(`${BASE}/v2/cart`, {
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
    const res = await fetch(`${BASE}/v2/cart`, { headers: this.headers() });
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
