export class BaseAssistant {
  name: string;
  systemPrompt: string;
  tools: Record<string, any>;

  constructor({
    name,
    systemPrompt,
    tools,
  }: {
    name: string;
    systemPrompt: string;
    tools: Record<string, any>;
  }) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
  }

  // ✅ Returns all tool JSON definitions (for planner context)
  getToolDefinitions() {
    return Object.values(this.tools).map((tool) => tool.definition);
  }

  // ✅ Optional hook for contextual post-processing (added earlier)
  async postProcess?(
    toolName: string,
    result: any,
    userQuery?: string
  ): Promise<string | null | any>;
}
