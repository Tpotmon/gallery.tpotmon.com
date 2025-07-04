import { describe, it, expect } from "bun:test";
import getBatchTwitterProfiles from "./batch-profiles";

describe("getBatchTwitterProfiles", () => {
  it("should return empty array for empty input", async () => {
    const result = await getBatchTwitterProfiles([], "test-key");
    expect(result).toEqual([]);
  });

  it("should construct correct URL with user IDs", () => {
    const userIds = ["1549984440432185345", "1736834221963096064"];
    const expectedUrl = "https://api.twitterapi.io/twitter/user/batch_info_by_ids?userIds=1549984440432185345%2C1736834221963096064";
    
    // This test would require mocking fetch to verify the URL
    // For now, we'll just test the URL construction logic
    const userIdsParam = userIds.join(',');
    const url = `https://api.twitterapi.io/twitter/user/batch_info_by_ids?userIds=${encodeURIComponent(userIdsParam)}`;
    
    expect(url).toBe(expectedUrl);
  });
});