import { assistants } from "@/lib/assistants";

export type AssistantName = keyof typeof assistants;

export interface RouterResult {
  assistantName: AssistantName;
  reason?: string;
}

/**
 * Ask the model to pick the most relevant assistant based on the user's request.
 */
export async function selectAssistantFromModel(userMessage: string): Promise<RouterResult> {
  try {
    const baseUrl = process.env.OPENAI_API_BASE_URL!;
    const apiKey = process.env.OPENAI_API_KEY!;
    const deployment = process.env.OPENAI_DEPLOYMENT_NAME!;
    const apiVersion = process.env.OPENAI_API_VERSION!;

    // Summarize assistants for the model
    const assistantSummaries = Object.values(assistants)
      .map((a) => `Assistant: ${a.name}\nPurpose: ${a.systemPrompt.split("\n")[1] || "No description"}`)
      .join("\n\n");

    const systemPrompt = `
You are an intelligent router that decides which assistant should handle a user's request.
Each assistant has different tools and purposes.

Choose ONE assistant from the list below.
Respond ONLY in JSON format: {"assistantName": "<name>", "reason": "<why this assistant fits>"}.

Available assistants:
${assistantSummaries}
`;

    const body = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `User request: "${userMessage}"` },
      ],
      temperature: 0,
      max_tokens: 200,
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
      const text = await resp.text();
      console.error("Router model error:", text);
      return { assistantName: "dateAssistant" };
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return { assistantName: "dateAssistant" };

    try {
      const parsed = JSON.parse(content);
      if (parsed.assistantName && parsed.assistantName in assistants) {
        return parsed as RouterResult;
      }
    } catch {
      console.warn("Router model gave non-JSON:", content);
    }

    return { assistantName: "dateAssistant" };
  } catch (err) {
    console.error("Router selection error:", err);
    return { assistantName: "dateAssistant" };
  }
}
