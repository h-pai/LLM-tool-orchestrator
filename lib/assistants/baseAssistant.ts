/**
 * BaseAssistant
 * 
 * This class defines a generic blueprint for building specialized assistants.
 * An assistant acts as an orchestrator that:
 * - Holds a system prompt describing its purpose or behavior.
 * - Manages a collection of callable tools (functions or APIs).
 * - Optionally performs post-processing on tool outputs.
 * 
 * The `BaseAssistant` class provides foundational structure that can be extended
 * or instantiated to create custom assistants with their own tools and logic.
 */

export class BaseAssistant {
  /** 
   * The name of the assistant, used for identification and logging.
   */
  name: string;

  /**
   * The default system prompt or instruction that defines
   * the assistant’s behavior or context when invoked.
   */
  systemPrompt: string;

  /**
   * A registry of available tools accessible to the assistant.
   * Each entry should include:
   * - `definition`: metadata describing the tool (name, description, parameters)
   * - `handler`: a function that executes the tool’s logic
   */
  tools: Record<string, any>;

  /**
   * Constructs a new assistant instance.
   *
   * @param name - The unique name identifying this assistant.
   * @param systemPrompt - The base system-level instruction defining behavior.
   * @param tools - A mapping of available tools by name.
   */
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

  /**
   * Retrieves structured JSON definitions for all registered tools.
   * 
   * This method is typically used when building a system prompt
   * for a planner model (e.g., when instructing an LLM to plan
   * which tools to call).
   *
   * @returns An array of tool definition objects.
   */
  getToolDefinitions() {
    return Object.values(this.tools).map((tool) => tool.definition);
  }

  /**
   * Optional hook for performing additional logic or formatting
   * after a tool’s result has been generated.
   *
   * Can be overridden in derived classes for use cases such as:
   * - Custom result transformation
   * - Validation or cleanup
   * - Combining multiple tool outputs
   *
   * @param toolName - The name of the tool that was executed.
   * @param result - The raw output from the tool execution.
   * @param userQuery - (Optional) The original user query that initiated the process.
   * @returns A post-processed result or null if no modification is needed.
   */
  async postProcess?(
    toolName: string,
    result: any,
    userQuery?: string
  ): Promise<string | null | any>;
}