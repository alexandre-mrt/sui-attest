/**
 * Truncate a hex address for display: 0x1234...abcd
 */
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Format a millisecond timestamp to a human-readable date string.
 */
export function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Decode a vector<u8> from on-chain representation.
 * On-chain it comes as an array of numbers.
 */
export function decodeBytes(bytes: number[]): string {
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/**
 * Encode a string to a vector<u8> compatible Uint8Array.
 */
export function encodeString(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

/**
 * Parse an Option<T> from chain: { vec: [] } → null, { vec: [v] } → v
 */
export function parseOption<T>(option: { vec: T[] } | null | undefined): T | null {
  if (!option || option.vec.length === 0) return null;
  return option.vec[0];
}

/**
 * Deterministic JSON serialization — recursively sorts all object keys.
 * Must match the SDK's stableStringify for consistent data hashes.
 */
export function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  const sorted = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + sorted.map((k) => JSON.stringify(k) + ':' + stableStringify((obj as Record<string, unknown>)[k])).join(',') + '}';
}

/**
 * Compute SHA-256 hash of attestation data with deterministic key ordering.
 */
export async function sha256Hex(data: Uint8Array<ArrayBuffer>): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash attestation data deterministically — matches SDK hashData().
 */
export async function hashAttestData(data: Record<string, unknown>): Promise<{ hex: string; bytes: Uint8Array }> {
  const json = stableStringify(data);
  const encoded = new TextEncoder().encode(json);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const bytes = new Uint8Array(hashBuffer);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return { hex, bytes };
}

/**
 * Convert a hex string to Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const result = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    result[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return result;
}
