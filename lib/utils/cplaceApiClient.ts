export interface CplaceApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

/**
 * Helper for calling cplace APIs (POST only).
 * Logs full outgoing request for debugging.
 */
export async function callCplaceAPI<T = any>(
  endpoint: string,
  body: Record<string, any> = {}
): Promise<CplaceApiResponse<T>> {
  try {
    const API_BASE = process.env.CPLACE_API_BASE_URL;
    const API_TOKEN = process.env.CPLACE_API_TOKEN;
    const USER = process.env.CPLACE_USER_NAME;
    const PASS = process.env.CPLACE_PASS;

    if (!API_BASE) return { success: false, error: "Missing CPLACE_API_BASE_URL." };

    const authHeader =
      USER && PASS ? `Basic ${Buffer.from(`${USER}:${PASS}`).toString("base64")}` : undefined;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add token and auth headers if available
    if (API_TOKEN) {
      // try different header types one at a time
      headers["x-api-key"] = API_TOKEN;
      // headers["Authorization"] = `Bearer ${API_TOKEN}`; // try this if 403 persists
    }
    if (authHeader) headers["Authorization"] = authHeader;

    // 🧩 Log full request for inspection
    // console.log("🚀 Final Cplace API Request:");
    // console.log("➡️ URL:", `${API_BASE}${endpoint}`);
    // console.log("➡️ Headers:", headers);
    // console.log("➡️ Body:", JSON.stringify(body, null, 2));

    const resp = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "x-api-key": `${API_TOKEN}`,
        "Content-Type": "application/json",
        "Authorization": `Basic ${PASS}`,
      },
      body: JSON.stringify(body),
    });

    // console.log("📡 Response status:", resp.status);

    const contentType = resp.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    const data = isJson ? await resp.json() : await resp.text();

    if (!resp.ok) {
      // console.error("❌ Cplace API error response:", data);
      return {
        success: false,
        error: `Request failed with status ${resp.status}`,
        status: resp.status,
        data,
      };
    }

    // console.log("✅ Cplace API data:", JSON.stringify(data.data));
    return { success: true, data, status: resp.status };
  } catch (err: any) {
    console.error("⚠️ Cplace API exception:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}