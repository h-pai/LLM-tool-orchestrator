import { BaseAssistant } from "./baseAssistant";
import { getCurrentDateTool } from "../tools/getCurrentDate";
import { getDayOfWeekTool } from "../tools/getDayOfWeek";

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
    getCurrentDate: { definition: getCurrentDateTool.definition, handler: getCurrentDateTool.handler, returnRaw: true },
    getDayOfWeek: { definition: getDayOfWeekTool.definition, handler: getDayOfWeekTool.handler, returnRaw: true },
  },
});
