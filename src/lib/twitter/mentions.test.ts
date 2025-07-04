import { expect, test } from "bun:test";
import getMentions from "./mentions";

const apiKey = process.env.TWITTER_API_KEY;

if (!apiKey) {
  console.warn(
    "\n[!] Missing TWITTER_API_KEY in environment.\n" +
      "    Create a `.env` file or set the variable directly:\n" +
      "    TWITTER_API_KEY=your-key bun test\n",
  );
  process.exit(1);
}

test("fetches mentions for user", async () => {
  const userName = "wagieweeb";
  const since = 1748060659618;
  const until = 1748103859618;

  const tweets = await getMentions(userName, apiKey, since, until);
  expect(Array.isArray(tweets)).toBe(true);
  expect(tweets.length).toBe(23);
  expect(tweets[0]).toHaveProperty("id");
  expect(tweets[0]).toHaveProperty("text");
  expect(typeof tweets[0]!.text).toBe("string");
});
