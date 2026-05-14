import type { FieldDefinition } from "./types.js";

/**
 * Compute SHA-256 hash of the JSON-serialized attestation data.
 * Returns the hash as a hex string and as a Uint8Array.
 */
export async function hashData(data: Record<string, unknown>): Promise<{
	hex: string;
	bytes: Uint8Array;
}> {
	const json = JSON.stringify(data, Object.keys(data).sort());
	const encoded = new TextEncoder().encode(json);
	const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
	const bytes = new Uint8Array(hashBuffer);
	const hex = Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return { hex, bytes };
}

/**
 * Convert field definitions into the three parallel vectors required by
 * the Move entry function create_schema:
 *   field_names: vector<vector<u8>>
 *   field_types: vector<vector<u8>>
 *   field_required: vector<bool>
 */
export function buildFieldDefinitions(fields: FieldDefinition[]): {
	fieldNames: number[][];
	fieldTypes: number[][];
	fieldRequired: boolean[];
} {
	const encoder = new TextEncoder();
	return {
		fieldNames: fields.map((f) => Array.from(encoder.encode(f.name))),
		fieldTypes: fields.map((f) => Array.from(encoder.encode(f.fieldType))),
		fieldRequired: fields.map((f) => f.required),
	};
}

/**
 * Encode a UTF-8 string into a number array (vector<u8> in Move).
 */
export function encodeString(value: string): number[] {
	return Array.from(new TextEncoder().encode(value));
}

/**
 * Convert a hex string (with or without 0x prefix) to a bigint.
 */
export function hexToBigInt(hex: string): bigint {
	const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
	return BigInt("0x" + (normalized || "0"));
}
