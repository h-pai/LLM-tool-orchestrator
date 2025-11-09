export const getCurrentDateTool = {
  definition: {
    type: "function",
    function: {
      name: "getCurrentDate",
      description: `Returns the current date/time in ISO 8601 format.
Optionally accepts a numeric offset in days to shift forward or backward from today.`,
      parameters: {
        type: "object",
        properties: {
          offset: {
            type: "number",
            description: "Days to add (positive) or subtract (negative) from today.",
          },
        },
      },
    },
  },
  handler: async ({ offset }: { offset?: number } = {}) => {
    const d = new Date();
    if (offset && !isNaN(offset)) {
      d.setDate(d.getDate() + offset);
    }
    return { date: d.toISOString() };
  },
};