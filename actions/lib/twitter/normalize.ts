/**
 * Normalize a Twitter username:
 * - Remove leading "@"
 * - Trim spaces
 * - Strip unsafe characters
 * - Lowercase for consistency
 */
export default function normalizeUsername(input: string): string {
  return input
    .trim()
    .replace(/^@/, "") // remove leading @
    .replace(/[?&=].*$/, "") // remove trailing query/param junk
    .replace(/[^a-zA-Z0-9_]/g, "") // remove any remaining bad chars
    .toLowerCase(); // normalize casing
}
