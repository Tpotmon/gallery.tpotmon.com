import type { Tweet, TweetsApiResponse, TweetsErrorResponse } from "./types";

/**
 * Fetch all mentions for a given username since a specific time using cursor pagination.
 *
 * @param username - Twitter username to fetch mentions for
 * @param apiKey - API key for the Twitter proxy
 * @param sinceTime - On or after a specified unix timestamp in seconds
 * @param untilTime - (Optional) Before a specified unix timestamp in seconds
 * @returns Array of Tweet objects containing mentions
 * @throws If API call fails or response is malformed
 */
export default async function getMentions(
  username: string,
  apiKey: string,
  sinceTime: number,
  untilTime: number,
): Promise<Tweet[]> {
  const allMentions: Tweet[] = [];
  let cursor = "";
  const sinceTimestamp = Math.floor(sinceTime / 1000).toString();
  const untilTimestamp = Math.floor(untilTime / 1000).toString();

  while (true) {
    const url = new URL("https://api.twitterapi.io/twitter/user/mentions");
    url.searchParams.set("userName", username);
    url.searchParams.set("sinceTime", sinceTimestamp);
    url.searchParams.set("untilTime", untilTimestamp);
    url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: { "X-API-Key": apiKey },
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({
        error: res.status,
        message: "Invalid JSON from Twitter API",
      }))) as TweetsErrorResponse;
      throw new Error(
        `Twitter API error ${err.error || res.status}: ${err.message || res.statusText}`,
      );
    }

    const json = (await res.json()) as TweetsApiResponse;
    const mentions = json.tweets ?? [];

    if (mentions.length === 0) break;

    for (const tweet of mentions) {
      allMentions.push(tweet);
    }

    if (!json.has_next_page || !json.next_cursor) break;
    cursor = json.next_cursor;
  }

  return allMentions;
}
