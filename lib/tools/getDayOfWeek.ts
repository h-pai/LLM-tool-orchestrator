export const getDayOfWeekTool = {
  definition: {
    type: "function",
    function: {
      name: "getDayOfWeek",
      description: "Takes an ISO date string and returns the day of the week (e.g., Monday).",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "ISO 8601 date string" },
        },
        required: ["date"],
      },
    },
  },
  handler: async ({ date }: { date: string }) => {
    // Use UTC/Locale as desired; example uses en-US weekday
    const day = new Date(date).toLocaleDateString("en-US", { weekday: "long" });
    return { day };
  },
};
