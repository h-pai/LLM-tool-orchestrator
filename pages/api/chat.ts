/**
 * This module defines an API route handler for interacting with an Azure OpenAI model
 * to dynamically generate and execute a sequence of tool calls based on user input.
 *
 * The model receives a system prompt describing available tools, produces a JSON-based
 * "plan" outlining which tools to invoke and in what order, and the server executes
 * them sequentially using a defined assistant object.
 *
 * Key features:
 * - Dynamically constructs a plan of tool invocations from a user query.
 * - Substitutes placeholders in arguments referencing previous tool outputs.
 * - Sequentially executes each step and returns the final result to the client.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { dateAssistant } from "@/lib/assistants/dateAssistant";

/**
 * Extracts a JSON array from model output content.
 * Handles direct, double-encoded, or embedded JSON within text.
 *
 * @param content - The raw text content from the model's response.
 * @returns A parsed JSON array if successfully extracted, or null otherwise.
 */
function extractJsonArray(content: string): any[] | null {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;

    // Handles cases where JSON content is stringified twice.
    if (typeof parsed === "string" && parsed.trim().startsWith("[")) {
      const nested = JSON.parse(parsed);
      if (Array.isArray(nested)) return nested;
    }
  } catch {}

  // Attempt to find a JSON array embedded within text.
  const match = content.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return null;
}

/**
 * Converts a tool's result into a human-readable string.
 * Handles various data types including primitives, arrays, and objects.
 *
 * @param res - The tool result to format.
 * @returns A readable string representation of the result.
 */
function stringifyToolResult(res: any): string {
  if (!res) return "";
  if (typeof res === "string") return res;
  if (typeof res === "number" || typeof res === "boolean") return String(res);
  if (Array.isArray(res)) return res.map(stringifyToolResult).join(", ");

  if (typeof res === "object") {
    if ("day" in res) return `Day: ${res.day}`;
    if ("date" in res) return `Date: ${res.date}`;
  }

  return JSON.stringify(res, null, 2);
}

/**
 * Substitutes placeholders of the form {{prev:index.field}} with
 * actual values from previously executed tool results.
 *
 * @param value - The value that may contain substitution placeholders.
 * @param results - The list of previously executed tool results.
 * @returns The same structure with substitutions applied.
 */
function substituteTemplates(value: any, results: any[]): any {
  if (typeof value === "string") {
    const regex = /{{\s*prev:(\d+)\.([\s\S]+?)\s*}}/;
    const match = value.match(regex);
    if (match) {
      const index = parseInt(match[1], 10);
      const path = match[2];
      const prev = results[index];
      if (!prev) return undefined;

      try {
        return path.split(".").reduce((acc: any, key) => acc?.[key], prev);
      } catch {
        return undefined;
      }
    }
    return value;
  }

  if (Array.isArray(value)) return value.map((v) => substituteTemplates(v, results));
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const k of Object.keys(value)) out[k] = substituteTemplates(value[k], results);
    return out;
  }
  return value;
}

/**
 * Sends a request to Azure OpenAI to generate a plan (list of tool calls)
 * based on the given conversation messages.
 *
 * The function dynamically constructs the system prompt using available
 * tools defined in the assistant and enforces JSON-only responses.
 *
 * @param messages - The chat messages provided by the user and context.
 * @returns A parsed array of tool invocation steps, or null if parsing fails.
 */
async function requestPlanFromModel(messages: any[]) {
  const baseUrl = process.env.OPENAI_API_BASE_URL!;
  const apiKey = process.env.OPENAI_API_KEY!;
  const deployment = process.env.OPENAI_DEPLOYMENT_NAME!;
  const apiVersion = process.env.OPENAI_API_VERSION!;

  const assistant = dateAssistant;

  // Construct system prompt detailing tool definitions and rules.
  const systemPrompt = `
You are a planner. Based on the user's request, return a JSON array of tool calls needed to fulfill the request.
Each step must be: { "tool": "<toolName>", "args": { ... } }.

Available tools and schemas:
${assistant.getToolDefinitions()
  .map(
    (d: any) =>
      `Tool name: ${d.function.name}\nDescription: ${d.function.description}\nParameters: ${JSON.stringify(
        d.function.parameters,
        null,
        2
      )}`
  )
  .join("\n\n")}

Rules:
1. Use the minimum number of tools to answer the user's question.
2. If you need a shifted date (e.g., "2 days later"), use getCurrentDate with { "offset": 2 }.
3. If the user wants the weekday, use getDayOfWeek after getting the date.
4. When referencing previous tool results, use the format {{prev:<index>.<field>}}.
5. Return only valid JSON, no extra text or comments.
`;

  const body = {
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    temperature: 0,
    max_tokens: 300,
  };

  // Send request to Azure OpenAI API.
  const resp = await fetch(
    `${baseUrl}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    }
  );

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  const parsed = extractJsonArray(content);
  return parsed || null;
}

/**
 * Main API handler.
 * 
 * This route accepts a POST request containing chat messages, requests
 * a tool invocation plan from Azure OpenAI, executes each tool step
 * sequentially, and returns the final result as a human-readable message.
 *
 * @param req - The incoming API request (expects { messages } in body).
 * @param res - The outgoing API response.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { messages } = req.body;
    const assistant = dateAssistant;

    // Step 1: Request a tool execution plan from the model.
    const plan = await requestPlanFromModel(messages);
    if (!plan) {
      res.status(200).json({
        choices: [{ message: { role: "assistant", content: "Sorry, I couldn't create a plan." } }],
      });
      return;
    }

    console.log("Executing plan:", JSON.stringify(plan, null, 2));

    // Step 2: Execute each tool sequentially.
    const results: any[] = [];
    for (const [i, step] of plan.entries()) {
      const toolName = step.tool;
      const toolEntry = assistant.tools[toolName];

      if (!toolEntry) {
        res.status(200).json({
          choices: [{ message: { role: "assistant", content: `Tool ${toolName} not found.` } }],
        });
        return;
      }

      // Substitute dynamic references from prior tool outputs.
      const args = step.args ? substituteTemplates(step.args, results) : {};
      const result = await toolEntry.handler(args);
      results.push(result);
      console.log(`Step ${i}:`, result);
    }

    // Step 3: Return the final tool output as formatted text.
    const finalResult = results[results.length - 1];
    res.status(200).json({
      choices: [{ message: { role: "assistant", content: stringifyToolResult(finalResult) } }],
    });
  } catch (err) {
    console.error("Chat handler error:", err);
    res.status(500).json({ error: "Server error" });
  }
}