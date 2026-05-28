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

async function createRohlikClient(email: string, password: string): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(ROHLIK_MCP_URL), {
    requestInit: {
      headers: {
        "rhl-email": email,
        "rhl-pass": password,
      },
    },
  });

  const client = new Client({ name: "foodlist", version: "1.0.0" });
  await client.connect(transport);
  return client;
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
    const mcpTools: Anthropic.Tool[] = toolsResponse.tools.map((t) => ({
      name: t.name,
      description: t.description ?? "",
      input_schema: (t.inputSchema as Anthropic.Tool["input_schema"]) ?? { type: "object", properties: {} },
    }));

    const itemsText = shoppingList
      .map((i) => `- ${i.name}: ${i.amount} ${i.unit}`)
      .join("\n");

    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: `Přidej tyto položky do košíku na Rohlík.cz pro ${householdSize} osob. Pro každou položku nejdřív vyhledej produkt, pak ho přidej do košíku ve správném množství.

Položky:
${itemsText}

Po přidání všech položek vrať JSON:
{
  "addedItems": [{ "name": "původní název", "rohlikName": "název na rohlíku", "price": 39.90, "amount": "500g" }],
  "notFoundItems": ["položky co nebyly nalezeny"],
  "estimatedTotal": 1250.50,
  "cartUrl": "https://www.rohlik.cz/kosik"
}`,
      },
    ];

    // Agentic loop – Claude volá Rohlík MCP tools dokud neskončí
    while (true) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        tools: mcpTools,
        system: "Jsi nákupní asistent. Vyhledáš produkty na Rohlík.cz a přidáš je do košíku. Pracuj systematicky a efektivně.",
        messages,
      });

      if (response.stop_reason === "end_turn") {
        // Claude skončil – extrahuj JSON výsledek
        const text = response.content
          .filter((b) => b.type === "text")
          .map((b) => (b as Anthropic.TextBlock).text)
          .join("");

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Claude nevrátil JSON výsledek");
        return JSON.parse(jsonMatch[0]) as RohlikCartResult;
      }

      if (response.stop_reason !== "tool_use") break;

      // Přidej assistant response do messages
      messages.push({ role: "assistant", content: response.content });

      // Zpracuj tool calls
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
            content: JSON.stringify(result.content),
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
