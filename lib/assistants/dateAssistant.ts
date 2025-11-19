/**
 * dateAssistant
 *
 * This module defines an instance of the `BaseAssistant` specialized
 * for handling date- and time-related queries. It serves as an intermediary
 * between the user’s natural language input and the tools that provide
 * date-based computations.
 *
 * The assistant can:
 * - Retrieve the current date or a date offset by a number of days.
 * - Determine the day of the week for a specific date.
 *
 * It is designed to interpret user queries such as:
 * - “What date will it be 3 days from now?”
 * - “What day was it 2 days ago?”
 * - “What day of the week is today?”
 *
 * If a query is unrelated to dates or days, the assistant responds with
 * `TOOL_NOT_AVAILABLE`, signaling that no suitable tool exists for that task.
 */

import { BaseAssistant } from "./baseAssistant";
import { getCurrentDateTool } from "../tools/getCurrentDate";
import { getDayOfWeekTool } from "../tools/getDayOfWeek";

/**
 * An instance of BaseAssistant configured to handle date and weekday queries.
 * 
 * System prompt:
 * - Explains the assistant’s purpose and available tools.
 * - Instructs the model how to plan tool usage.
 * - Enforces pure JSON output for tool invocation plans.
 *
 * Available tools:
 * 1. **getCurrentDate(offset)**  
 *    - Returns today’s date or a shifted date based on the offset.
 *    - Example: offset = +1 → tomorrow, offset = -1 → yesterday.
 *
 * 2. **getDayOfWeek(date)**  
 *    - Returns the weekday (e.g., Monday, Tuesday) for a given date.
 *
 * Tool usage guidelines:
 * - When interpreting phrases like “in 2 days” or “3 days ago,” use `getCurrentDate` with the correct offset.
 * - When the query involves determining the weekday, use `getDayOfWeek` after retrieving the date.
 * - For unrelated topics, the assistant should output `TOOL_NOT_AVAILABLE`.
 */
export const dateAssistant = new BaseAssistant({
  name: "dateAssistant",
  systemPrompt: `
You are DateAssistant. You can use two tools:
- getCurrentDate(offset): returns today's date or a shifted date (offset in days; +1 = tomorrow, -1 = yesterday).
- getDayOfWeek(date): returns the weekday.

When the user asks things like "2 days later" or "3 days ago", use getCurrentDate with the appropriate offset.
Then use getDayOfWeek if they want to know the weekday.
If the request has nothing to do with dates or days, return TOOL_NOT_AVAILABLE.
Return plans as pure JSON only.
`,

  tools: {
    getCurrentDate: {
      definition: getCurrentDateTool.definition,
      handler: getCurrentDateTool.handler,
      returnRaw: true,
    },
    getDayOfWeek: {
      definition: getDayOfWeekTool.definition,
      handler: getDayOfWeekTool.handler,
      returnRaw: true,
    },
  },
});
