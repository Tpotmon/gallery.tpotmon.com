import normalizeUsername from "./normalize";
import type {
  TwitterProfileApiResponse,
  TwitterProfileErrorResponse,
  TwitterProfile,
} from "./types";

/**
 * Fetches a sanitized Twitter profile from the external API.
 *
 * This function:
 * - Normalizes the username (strips `@`, junk chars, lowercases)
 * - Sends a GET request to the Twitter proxy API
 * - Validates both HTTP status and logical API status
 * - Returns the full `TwitterProfile` object on success
 * - Throws a descriptive error on failure
 *
 * @param username - Twitter handle (with or without `@`, e.g. "@jack" or "jack")
 * @param apiKey - API key required for the external Twitter proxy
 * @returns Parsed `TwitterProfile` object
 * @throws Error if the request fails or the response is malformed
 */
export default async function getTwitterProfile(
  username: string,
  apiKey: string,
): Promise<TwitterProfile> {
  const url = `https://api.twitterapi.io/twitter/user/info?userName=${normalizeUsername(username)}`;
  const res = await fetch(url, {
    headers: { "X-API-Key": apiKey },
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({
      error: res.status,
      message: "Invalid JSON from Twitter API",
    }))) as TwitterProfileErrorResponse;
    throw new Error(
      `Twitter API error ${err.error || res.status}: ${err.message || res.statusText}`,
    );
  }

  const json = (await res.json()) as TwitterProfileApiResponse;

  if (json.status !== "success" || !json.data) {
    throw new Error(`Twitter API failure: ${json.msg || "Unknown error"}`);
  }

  return json.data;
}
