import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ShoppingItem } from "./meal-planner";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ROHLIK_MCP_URL = "https://mcp.rohlik.cz/mcp";

// Pouze nástroje potřebné pro vyhledání a košík
const ALLOWED_TOOLS = [
  "batch_search_products",
  "add_items_to_cart",
  "get_cart",
  "get_product_details",
  "update_cart_item",
  "remove_cart_item",
  "clear_cart",
];

export interface RohlikCartResult {
  addedItems: { name: string; rohlikName: string; price: number; amount: string }[];
  notFoundItems: string[];
  estimatedTotal: number;
  cartUrl: string;
}

async function createRohlikClient(email: string, password: string): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(ROHLIK_MCP_URL), {
    requestInit: {
      headers: {
        "rhl-email": email,
        "rhl-pass": password,
      },
    },
  });

  const client = new Client({ name: "kostki", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err instanceof Anthropic.RateLimitError ||
        (err instanceof Error && err.message.includes("429"));

      if (isRateLimit && attempt < maxRetries - 1) {
        const waitMs = (attempt + 1) * 70000; // 70s, 140s
        console.log(`Rate limit hit, waiting ${waitMs / 1000}s before retry ${attempt + 1}...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function fillRohlikCart(
  shoppingList: ShoppingItem[],
  rohlikEmail: string,
  rohlikPassword: string,
  householdSize: number
): Promise<RohlikCartResult> {
  const mcpClient = await createRohlikClient(rohlikEmail, rohlikPassword);

  try {
    const toolsResponse = await mcpClient.listTools();

    // Filtruj jen relevantní nástroje — šetří input tokeny
    const allTools = toolsResponse.tools;
    const filteredTools = allTools.filter((t) => ALLOWED_TOOLS.includes(t.name));
    const toolsToUse = filteredTools.length > 0 ? filteredTools : allTools.slice(0, 8);
    console.log("Tools to use:", toolsToUse.map(t => t.name).join(", "));

    console.log(`Rohlik MCP tools: ${allTools.length} total, using ${toolsToUse.length}`);

    const mcpTools: Anthropic.Tool[] = toolsToUse.map((t) => ({
      name: t.name,
      description: (t.description ?? "").slice(0, 200), // zkrátíme popis
      input_schema: (t.inputSchema as Anthropic.Tool["input_schema"]) ?? { type: "object", properties: {} },
    }));

    const itemsText = shoppingList
      .map((i) => `- ${i.name}: ${i.amount} ${i.unit}`)
      .join("\n");

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `Přidej do košíku na Rohlík.cz (pro ${householdSize} osob):\n${itemsText}\n\nPo dokončení vrať JSON:\n{"addedItems":[{"name":"orig","rohlikName":"rohlik","price":0,"amount":""}],"notFoundItems":[],"estimatedTotal":0,"cartUrl":"https://www.rohlik.cz"}`,
      },
    ];

    // Agentic loop s retry na rate limit
    let loopCount = 0;
    while (loopCount++ < 20) {
      const response = await withRetry(() =>
        anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          tools: mcpTools,
          system: `Jsi nákupní asistent na Rohlík.cz. Máš tyto nástroje:
- batch_search_products: vyhledej produkty. Argument: {"queries": [{"keyword": "název produktu"}]} — queries je POLE OBJEKTŮ s klíčem "keyword"
- add_items_to_cart: přidej do košíku. Argument: {"items": [{"productId": 123, "quantity": 1}]} — POVINNÝ klíč je "quantity" ne "amount"!
- get_cart: zobraz košík (bez argumentů)

Postup:
1) Vyhledej každou položku pomocí batch_search_products (max 4 najednou)
2) Z výsledků vyber nejlepší produkt (správná gramáž, rozumná cena)
3) Přidej do košíku pomocí add_items_to_cart
4) Opakuj dokud nejsou všechny položky v košíku
5) Vrať JSON výsledek`,
          messages,
        })
      );

      if (response.stop_reason === "end_turn") {
        const text = response.content
          .filter((b) => b.type === "text")
          .map((b) => (b as Anthropic.TextBlock).text)
          .join("");

        console.log("Claude final response:", text.slice(0, 500));

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[0]) as RohlikCartResult;
          } catch {
            console.log("JSON parse failed, using fallback");
          }
        }

        // Fallback — Claude nakoupil ale nevrátil JSON → zeptej se znovu
        messages.push({ role: "assistant", content: response.content });
        messages.push({
          role: "user",
          content: 'Shrň výsledek jako JSON: {"addedItems":[{"name":"string","rohlikName":"string","price":0,"amount":"string"}],"notFoundItems":["string"],"estimatedTotal":0,"cartUrl":"https://www.rohlik.cz"}',
        });
        continue;
      }

      console.log("stop_reason:", response.stop_reason);
      if (response.stop_reason === "max_tokens") {
        // Dosáhli jsme limitu tokenů — požádej o shrnutí
        messages.push({ role: "assistant", content: response.content });
        messages.push({
          role: "user",
          content: 'Vrať JSON shrnutí co jsi přidal do košíku: {"addedItems":[{"name":"string","rohlikName":"string","price":0,"amount":"string"}],"notFoundItems":[],"estimatedTotal":0,"cartUrl":"https://www.rohlik.cz"}',
        });
        continue;
      }
      if (response.stop_reason !== "tool_use") {
        console.log("Unexpected stop_reason:", response.stop_reason, response.content);
        break;
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        try {
          const result = await mcpClient.callTool({
            name: block.name,
            arguments: block.input as Record<string, unknown>,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result.content).slice(0, 2000), // limituj odpověď
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Chyba: ${err instanceof Error ? err.message : String(err)}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }

    throw new Error("Agentic loop skončil neočekávaně");
  } finally {
    await mcpClient.close();
  }
}
