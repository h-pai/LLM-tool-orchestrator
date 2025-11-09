import { getCurrentDateTool } from "./getCurrentDate";
import { getDayOfWeekTool } from "./getDayOfWeek";
import { fetchMeetingsTool } from "./fetchMeetings";
import { fetchMeetingDetailsTool } from "./fetchMinutesSummary";
import { generateActionsTool } from "./generateActionsTool";

export const tools = {
  getCurrentDate: getCurrentDateTool,
  getDayOfWeek: getDayOfWeekTool,
  fetchMeetings: fetchMeetingsTool,
  fetchMeetingDetails: fetchMeetingDetailsTool,
   generateActions: generateActionsTool,
};
