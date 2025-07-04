import { expect, test } from "bun:test";
import getTwitterProfile from "./profile";

const apiKey = process.env.TWITTER_API_KEY;

if (!apiKey) {
  console.warn(
    "\n[!] Missing TWITTER_API_KEY in environment.\n" +
      "    Create a `.env` file or set the variable directly:\n" +
      "    TWITTER_API_KEY=your-key bun test\n",
  );
  process.exit(1); // hard exit for test runner
}

test("fetches profile for valid username", async () => {
  const profile = await getTwitterProfile("@wagieweeb", apiKey);
  expect(profile.userName).toBe("WagieWeeb");
  expect(profile.id).toBeTruthy();
  expect(typeof profile.followers).toBe("number");
});
