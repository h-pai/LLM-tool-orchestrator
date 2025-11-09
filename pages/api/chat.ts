import type { NextApiRequest, NextApiResponse } from "next";
import { assistants } from "@/lib/assistants";
import { BaseAssistant } from "@/lib/assistants/baseAssistant";
import { selectAssistantFromModel } from "@/lib/ai/selectAssistant";

// ---------------- Helper Functions ----------------

function stringifyToolResult(res: unknown): string {
  if (res === null || res === undefined) return "";
  if (typeof res === "string") return res;
  if (typeof res === "number" || typeof res === "boolean") return String(res);
  if (Array.isArray(res)) return res.map(stringifyToolResult).join(", ");

  try {
    const obj = res as Record<string, unknown>;
    if ("day" in obj) return String((obj as any).day);
    if ("date" in obj) return String((obj as any).date);

    if ("meetings" in obj) {
      const meetings = (obj as any).meetings;
      if (Array.isArray(meetings)) {
        return (
          "Meetings:\n" +
          meetings.map((m: any, i: number) => `${i + 1}. ${m.name} (id: ${m.id})`).join("\n")
        );
      }
    }

    return JSON.stringify(obj);
  } catch {
    return String(res);
  }
}

function extractJsonArray(content: string): any[] | null {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
  } catch { }

  const match = content.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch { }
  }
  return null;
}

function substituteTemplates(value: any, results: any[]): any {
  // Handle string substitution templates like {{prev:0.field.subfield}}
  if (typeof value === "string") {
    const regex = /{{\s*prev:(\d+)\.([\s\S]+?)\s*}}/; // matches {{prev:0.something}}
    const match = value.match(regex);
    if (match) {
      const index = parseInt(match[1], 10);
      const path = match[2];
      const prev = results[index];
      if (prev === undefined) return undefined;

      // Resolve nested fields and array indices dynamically
      try {
        const resolved = path.split(".").reduce((acc: any, key) => {
          const arrayMatch = key.match(/(\w+)\[(\d+)\]/);
          if (arrayMatch) {
            const [, prop, idx] = arrayMatch;
            return acc && acc[prop] ? acc[prop][parseInt(idx, 10)] : undefined;
          }
          return acc ? acc[key] : undefined;
        }, prev);

        return resolved;
      } catch {
        return undefined;
      }
    }

    // No match → return as-is
    return value;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((v) => substituteTemplates(v, results));
  }

  // Handle objects recursively
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      out[key] = substituteTemplates(value[key], results);
    }
    return out;
  }
  if (typeof value === "string" && value.includes("prev:")) {
    console.log("🧩 Substituting template:", value);
  }
  // Primitive fallback
  return value;
}


// 🧩 NEW — sanitize arguments before sending to any tool
function sanitizeArgs(toolDef: any, rawArgs: Record<string, any> = {}) {
  try {
    const allowed =
      toolDef?.function?.parameters?.properties
        ? Object.keys(toolDef.function.parameters.properties)
        : [];
    const clean: Record<string, any> = {};
    for (const key of allowed) {
      if (key in rawArgs) clean[key] = rawArgs[key];
    }
    return clean;
  } catch {
    return rawArgs;
  }
}

type PlanStep = { tool: string; args?: Record<string, any> };
type Plan = PlanStep[];

// ---------------- Planner ----------------

async function requestPlanFromModel(messages: any[], assistant: BaseAssistant) {
  const baseUrl = process.env.OPENAI_API_BASE_URL!;
  const apiKey = process.env.OPENAI_API_KEY!;
  const deployment = process.env.OPENAI_DEPLOYMENT_NAME!;
  const apiVersion = process.env.OPENAI_API_VERSION!;

  const systemPrompt = `
You are a planning engine that creates a structured list of tool calls needed to fulfill the user's request.

Your job is to produce a JSON array of steps. Each step must be an object:
{ "tool": "<toolName>", "args": { ... } }

Each assistant provides you with a list of available tools.

Available tools and their schemas:
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


Your plan must be **pure JSON** — no prose, comments, or explanations.

---

### 🧭 General Rules

1. Use tools **only as needed** to satisfy the user's intent.
   - If a single tool can fulfill the query, use just that one.
   - If one tool’s output is required by another (e.g., ID lookup → detail fetch), chain them in order.

2. When referencing data from a previous tool’s output, always use this template syntax:
   **"{{prev:<stepIndex>.<fieldPath>}}"**
   Example: 
   \`\`\`json
   {"tool": "fetchMeetingDetails", "args": {"meetingId": "{{prev:0.meetings[0].meetingId}}"}}
   \`\`\`
   - Never use tool names like \`{{fetchMeetings.meetings[0].id}}\`.
   - Always refer to previous results by their numeric index.

3. If you must call a lookup or helper tool (like fetching a list to find an ID),
   treat that tool as an **internal step**. 
   The final tool in your plan should always produce the user's final visible answer.

4. Use only the parameters defined in each tool’s schema.
   - Never invent or add keys not listed (like "date", "name", "meeting", etc.).
   - If you don’t have a required parameter yet, first call a tool that can provide it.

5. If the user’s request cannot be completed with available tools, return:
   \`\`\`json
   [{"tool":"TOOL_NOT_AVAILABLE"}]
   \`\`\`

6. Always ensure your output is **valid JSON** — no markdown, no extra text.

---

### 🧠 Examples

**Example 1 – Simple direct call**
User: "What’s today’s date?"
Plan:
\`\`\`json
[{"tool":"getCurrentDate","args":{}}]
\`\`\`

**Example 2 – Dependent tool chain**
User: "Show me details for 2025-05-28 Project Review"
Plan:
\`\`\`json
[
  {"tool": "fetchMeetings", "args": {}},
  {"tool": "fetchMeetingDetails", "args": {"meetingId": "{{prev:0.meetings[0].meetingId}}"}}
]
\`\`\`

---

Your response must contain only the JSON plan, nothing else.
`;

  const body = {
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    temperature: 0.0,
    max_tokens: 400,
  };

  const resp = await fetch(
    `${baseUrl}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("Planner model error:", txt);
    return { error: `Planner model error: ${resp.status}` };
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  const parsed = extractJsonArray(content);
  if (!parsed) return { error: "Failed to parse plan JSON from model." };
  return parsed as Plan;
}

// ---------------- Main Handler ----------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { messages } = req.body;
    const userMsg = messages[messages.length - 1]?.content || "";

    // 🧠 Ask the model to select the correct assistant dynamically
    const routerDecision = await selectAssistantFromModel(userMsg);
    const assistant =
      assistants[routerDecision.assistantName as keyof typeof assistants] ||
      assistants.dateAssistant;

    console.log(
      `🤖 Router selected: ${routerDecision.assistantName} → ${routerDecision.reason || "no reason provided"}`
    );

    // 🧩 Generate the plan from the selected assistant
    const planOrErr = await requestPlanFromModel(messages, assistant);
    if (!planOrErr) {
      res.status(200).json({
        choices: [
          { message: { role: "assistant", content: "Sorry, I couldn't create a plan for that request." } },
        ],
      });
      return;
    }

    if ("error" in planOrErr) {
      res.status(200).json({
        choices: [{ message: { role: "assistant", content: planOrErr.error } }],
      });
      return;
    }

    const plan = planOrErr as Plan;
    console.log("🧠 Executing plan:", JSON.stringify(plan, null, 2));
    const results: any[] = [];

    // 🔧 Execute each step in the plan sequentially
    for (const step of plan) {
      const toolName = step.tool.replace(/^functions\./, "");
      if (toolName === "TOOL_NOT_AVAILABLE") {
        res.status(200).json({
          choices: [
            { message: { role: "assistant", content: "Sorry, no suitable tool is available for that request." } },
          ],
        });
        return;
      }

      const toolEntry = assistant.tools[toolName];
      console.log('toolname: ' + JSON.stringify(toolEntry))
      if (!toolEntry) {
        res.status(200).json({
          choices: [
            { message: { role: "assistant", content: `Tool "${step.tool}" not found for this assistant.` } },
          ],
        });
        return;
      }

      // 🧠 Substitute templates and sanitize arguments
      let args = step.args ? substituteTemplates(step.args, results) : {};
      args = sanitizeArgs(toolEntry.definition, args); // ✅ new line: removes invalid params

      const toolResult = await toolEntry.handler(args);
      results.push(toolResult);
      console.log("🔍 Results so far:", JSON.stringify(results, null, 2));
    }

    // 🏁 Return final result
    const last = results[results.length - 1];
    const out = stringifyToolResult(last);
    res.status(200).json({ choices: [{ message: { role: "assistant", content: out } }] });
  } catch (err) {
    console.error("Chat handler error:", err);
    res.status(500).send("Server error");
  }
}