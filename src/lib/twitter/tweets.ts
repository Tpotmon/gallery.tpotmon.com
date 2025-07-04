import type { Tweet, TweetsApiResponse, TweetsErrorResponse } from "./types";

/**
 * Fetch up to `count` tweets from a given user ID using cursor pagination.
 *
 * @param userId - Twitter user ID
 * @param apiKey - API key for the Twitter proxy
 * @param count - Total number of tweets to collect (max across pages)
 * @returns Array of Tweet objects (not cleaned or filtered)
 * @throws If API call fails or response is malformed
 */
export default async function getTweetsByUserId(
  userId: string,
  apiKey: string,
  count: number,
): Promise<Tweet[]> {
  const allTweets: Tweet[] = [];
  let nextCursor: string | null = null;

  while (allTweets.length < count) {
    const url = new URL("https://api.twitterapi.io/twitter/user/last_tweets");
    url.searchParams.set("userId", userId);
    if (nextCursor) url.searchParams.set("cursor", nextCursor);

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
    const tweets = json.data?.tweets ?? [];

    for (const tweet of tweets) {
      if (tweet.type === "tweet") {
        allTweets.push(tweet);
        if (allTweets.length >= count) break;
      }
    }

    if (!json.has_next_page || !json.next_cursor) break;
    if (allTweets.length >= count) break;
    nextCursor = json.next_cursor;
  }

  return allTweets.slice(0, count);
}
