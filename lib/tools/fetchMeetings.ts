import { callCplaceAPI } from "../utils/cplaceApiClient";

export const fetchMeetingsTool = {
    definition: {
        type: "function",
        function: {
            name: "fetchMeetings",
            description: "Fetches all meetings from cplace and returns their names and UIDs.",
            parameters: {
                type: "object",
                properties: {
                    limit: {
                        type: "number",
                        description: "Optional limit for number of meetings to fetch.",
                    },
                },
            },
        },
    },

    handler: async ({ limit }: { limit?: number } = {}) => {
        try {
            const endpoint = "/pages";
            const requestBody = {
                "select": [

                ],
                "where": {
                    "type": "dtb.moduleTeamMeeting",
                    "spaces": [
                        "space/ssj824tv7owh6ktuxa685u3ac"
                    ]
                }
            };

            const response = await callCplaceAPI(endpoint, requestBody);

            if (!response.success) {
                return { error: response.error || "Failed to fetch meetings." };
            }

            // ✅ cplace returns { data: { exception: "", data: [...] } }
            const apiData = (response.data as any)?.data?.data;
            if (!Array.isArray(apiData)) {
                console.error("Unexpected API structure:", response.data);
                return { error: "Invalid API response format." };
            }

            // ✅ Normalize data structure
            const meetings = apiData.map((m: any) => ({
                meetingId: m.uid,
                id: m.uid,
                name: m.name,
            }));

            // Optional: sort or filter if needed
            const limited = limit ? meetings.slice(0, limit) : meetings;

            // Return readable structure
            return { meetings: limited };
        } catch (err: any) {
            console.error("fetchMeetingsTool error:", err);
            return { error: "Unexpected error fetching meetings." };
        }
    },
};
