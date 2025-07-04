import type {
  BatchUserInfoResponse,
  BatchUserInfoErrorResponse,
  TwitterProfile,
} from "./types";

/**
 * Fetches multiple Twitter profiles by their user IDs using the batch endpoint.
 *
 * This function:
 * - Takes an array of Twitter user IDs
 * - Sends a GET request to the Twitter batch user info API
 * - Validates both HTTP status and logical API status
 * - Returns an array of TwitterProfile objects
 * - Throws a descriptive error on failure
 *
 * @param userIds - Array of Twitter user IDs (e.g. ["1549984440432185345", "1736834221963096064"])
 * @param apiKey - API key required for the external Twitter proxy
 * @returns Array of TwitterProfile objects
 * @throws Error if the request fails or the response is malformed
 */
export default async function getBatchTwitterProfiles(
  userIds: string[],
  apiKey: string,
): Promise<TwitterProfile[]> {
  if (userIds.length === 0) {
    return [];
  }

  // Join user IDs with commas and URL encode
  const userIdsParam = userIds.join(',');
  const url = `https://api.twitterapi.io/twitter/user/batch_info_by_ids?userIds=${encodeURIComponent(userIdsParam)}`;
  
  const res = await fetch(url, {
    headers: { "X-API-Key": apiKey },
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({
      error: res.status,
      message: "Invalid JSON from Twitter API",
    }))) as BatchUserInfoErrorResponse;
    throw new Error(
      `Twitter Batch API error ${err.error || res.status}: ${err.message || res.statusText}`,
    );
  }

  const json = (await res.json()) as BatchUserInfoResponse;

  if (json.status !== "success" || !json.users) {
    throw new Error(`Twitter Batch API failure: ${json.msg || "Unknown error"}`);
  }

  return json.users;
}