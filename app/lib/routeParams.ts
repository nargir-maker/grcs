// Next.js 16 / Turbopack does not decode percent-encoded UTF-8 bytes in
// dynamic route segments before exposing them via useParams() — e.g. a
// Firestore doc id containing "Χ" (Greek capital chi) arrives as the
// literal string "...2%CE%A7200..." instead of "...2Χ200...". Decode
// defensively since already-decoded values pass through unchanged.
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
