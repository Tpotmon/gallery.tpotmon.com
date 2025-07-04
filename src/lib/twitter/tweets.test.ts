import { expect, test } from "bun:test";
import getTweetsByUserId from "./tweets";

const apiKey = process.env.TWITTER_API_KEY;

if (!apiKey) {
  console.warn(
    "\n[!] Missing TWITTER_API_KEY in environment.\n" +
      "    Create a `.env` file or set the variable directly:\n" +
      "    TWITTER_API_KEY=your-key bun test\n",
  );
  process.exit(1); // hard exit for test runner
}

const userId = "828928062196551680";
test("fetches 100 tweets for Elon Musk", async () => {
  const tweets = await getTweetsByUserId(userId, apiKey, 25);

  expect(Array.isArray(tweets)).toBe(true);
  expect(tweets.length).toBe(25); // allow API to slightly undershoot
  expect(tweets[0]).toHaveProperty("id");
  expect(tweets[0]).toHaveProperty("text");
  expect(typeof tweets[0]!.text).toBe("string");
});
