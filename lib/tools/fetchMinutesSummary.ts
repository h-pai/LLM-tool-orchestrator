import { callCplaceAPI } from "../utils/cplaceApiClient";

export const fetchMeetingDetailsTool = {
  definition: {
    type: "function",
    function: {
      name: "fetchMeetingDetails",
      description:
        "Fetches detailed information for a given meeting ID, including topics, topic points, and minutes (plain text summary).",
      parameters: {
        type: "object",
        properties: {
          meetingId: {
            type: "string",
            description: "Unique ID of the meeting to fetch details for.",
          },
        },
        required: ["meetingId"],
      },
    },
  },

  handler: async ({ meetingId }: { meetingId: string }) => {
    console.log("fetchMeetingDetailsTool invoked with meetingId:", meetingId);
    try {
      // STEP 1️⃣ - Fetch topics
      const topicsEndpoint = `/incomingReference`;
      const requestBody = {
        pageId: meetingId,
        type: "dtb.moduleTeamMeetingTopicBlock",
        attribute: "dtb.moduleTeamMeeting",
      };
      const topicsResponse = await callCplaceAPI(topicsEndpoint, requestBody);
      const topicsArray = topicsResponse?.data?.data?.body;

      if (!Array.isArray(topicsArray) || topicsArray.length === 0)
        return "⚠️ No topics found for this meeting.";

      const topicsWithDetails: any[] = [];

      // STEP 2️⃣ - Fetch topic points for each topic
      for (const topic of topicsArray) {
        const topicId = topic.id;
        const topicName = topic.pageName || "Unnamed Topic";

        const tpEndpoint = `/incomingReference`;
        const tpRequestBody = {
          pageId: topicId,
          type: "dtb.moduleTeamMeetingTopicPoint",
          attribute: "dtb.topic",
          getAttributes: ["dtb.shortDescription"],
        };

        const tpResponse = await callCplaceAPI(tpEndpoint, tpRequestBody);
        const topicPoints = tpResponse?.data?.data?.body || [];

        const formattedPoints = topicPoints.map((tp: any) => ({
          id: tp.id,
          pageName: tp.pageName || "Untitled Point",
          minutes:
            tp["short description"] ||
            tp["dtb.shortDescription"] ||
            tp.shortDescription ||
            "",
        }));

        topicsWithDetails.push({
          id: topicId,
          name: topicName,
          points: formattedPoints,
        });
      }

      // STEP 3️⃣ - Build readable text summary
      const summary = topicsWithDetails
        .map((t) => {
          const header = `🗂️ ${t.name}`;
          const body =
            t.points.length > 0
              ? t.points
                  .map((p: any) => {
                    const desc = p.minutes ? ` — ${p.minutes}` : "";
                    return `   🔹 ${p.pageName}${desc}`;
                  })
                  .join("\n")
              : "   • No topic points available.";
          return `${header}\n${body}`;
        })
        .join("\n\n");

      return summary.trim();
    } catch (err: any) {
      console.error("fetchMeetingDetailsTool error:", err);
      return "⚠️ Unexpected error fetching meeting details.";
    }
  },
};