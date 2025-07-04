import { expect, test } from "bun:test";
import normalizeUsername from "./normalize";

test("strips @, whitespace, and junk", () => {
  expect(normalizeUsername("@jack")).toBe("jack");
  expect(normalizeUsername("  jane_doe?foo=bar ")).toBe("jane_doe");
  expect(normalizeUsername("mr🔥robot!!")).toBe("mrrobot");
  expect(normalizeUsername("Bob&=1")).toBe("bob");
});
