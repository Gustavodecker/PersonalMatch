/**
 * Normalizes text for accent/case-insensitive comparison.
 * Matches the DB function normalize_text().
 */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Returns true if haystack contains needle after normalization.
 */
export function normalizedIncludes(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack || !needle) return false;
  return normalizeText(haystack).includes(normalizeText(needle));
}

/**
 * Returns true if haystack exactly equals needle after normalization.
 */
export function normalizedEquals(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack || !needle) return false;
  return normalizeText(haystack) === normalizeText(needle);
}
