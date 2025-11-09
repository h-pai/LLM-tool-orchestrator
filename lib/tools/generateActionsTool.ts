export const generateActionsTool = {
    definition: {
        type: "function",
        function: {
            name: "generateActions",
            description:
                "Generate relevant action items based on topic point minutes or discussion notes.",
            parameters: {
                type: "object",
                properties: {
                    topicPointTitle: { type: "string", description: "Title of the topic point" },
                    minutes: { type: "string", description: "Minutes or discussion text" },
                    topicName: { type: "string", description: "Parent topic name (optional)" },
                },
                required: ["topicPointTitle", "minutes"],
            },
        },
    },

    handler: async ({
        topicPointTitle,
        minutes,
        topicName,
    }: {
        topicPointTitle: string;
        minutes: string;
        topicName?: string;
    }) => {
        try {
            const baseUrl = process.env.OPENAI_API_BASE_URL!;
            const apiKey = process.env.OPENAI_API_KEY!;
            const deployment = process.env.OPENAI_DEPLOYMENT_NAME!;
            const apiVersion = process.env.OPENAI_API_VERSION!;

            const systemPrompt = `
You are an expert meeting summarizer and action generator.
From a meeting topic point and its minutes, identify concrete next steps as action items.
Prefer to generate 2–4 short, specific, outcome-focused actions.

Examples:
Minutes: "The API test suite needs updates and staging environment is not stable."
Actions:
- Update API test suite to include latest endpoints.
- Stabilize staging environment before next deployment.

Minutes: "General discussion on process flow, nothing pending."
Actions:
- No immediate actions identified.

If nothing actionable is found, return exactly "No immediate actions identified.".
Keep output short and clear.
`;

            const userPrompt = `
Topic: ${topicName || "(none)"}
Topic Point: ${topicPointTitle}
Minutes:
${minutes}
`;


            const response = await fetch(
                `${baseUrl}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": apiKey,
                    },
                    body: JSON.stringify({
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: userPrompt },
                        ],
                        temperature: 0.5,
                        max_tokens: 250,
                    }),
                }
            );

            const data = await response.json();
            const content =
                data.choices?.[0]?.message?.content?.trim() || "No response generated.";

            // Try to split into clean bullet list if model outputs raw text
            const actions = content
                .split("\n")
                .map((a: string) => a.replace(/^[\-\d\.\•]+\s*/, "").trim())
                .filter(Boolean);

            // 🧾 If no actions, provide a clear short text
            if (!actions || actions.length === 0) {
                return "No immediate actions identified.";
            }

            // 🧠 Create a clean human-readable string
            const readableOutput =
                `✅ ` +
                actions.map((a: string) => `- ${a}`).join("\n");

            return readableOutput;
        } catch (error: any) {
            console.error("generateActionsTool error:", error);
            return { error: "Failed to generate actions.", details: error.message };
        }
    },
};