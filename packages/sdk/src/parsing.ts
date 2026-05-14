import type { FieldDefinition, Schema, Attestation } from "./types.js";

/**
 * Parse a Move Option<T> returned as JSON from the chain.
 * { vec: [] } → null
 * { vec: [value] } → value
 */
export function parseOption<T>(
	raw: unknown,
): T | null {
	if (raw == null) return null;
	if (
		typeof raw === "object" &&
		"vec" in (raw as Record<string, unknown>)
	) {
		const vec = (raw as { vec: T[] }).vec;
		return vec.length > 0 ? vec[0] : null;
	}
	return null;
}

/**
 * Decode a Move vector<u8> encoded as an array of numbers into a UTF-8 string.
 */
export function decodeBytes(raw: unknown): string {
	if (Array.isArray(raw)) {
		return new TextDecoder().decode(new Uint8Array(raw as number[]));
	}
	if (typeof raw === "string") {
		return raw;
	}
	return "";
}

/**
 * Convert a u256 from chain (may be a decimal string or number) to a
 * 0x-prefixed hex string, or null if absent.
 */
export function parseU256AsHex(raw: unknown): string | null {
	if (raw == null) return null;
	const n = BigInt(String(raw));
	return "0x" + n.toString(16);
}

/**
 * Parse a Move vector<u8> stored as an array of numbers into a hex string.
 */
export function parseBytesAsHex(raw: unknown): string {
	if (!Array.isArray(raw)) return "";
	const bytes = raw as number[];
	return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Parse a JSON object returned by the chain for a SchemaRecord.
 * The object must have the Move field names (snake_case).
 */
export function parseSchemaRecord(
	id: string,
	fields: Record<string, unknown>,
): Schema {
	const rawFields = fields.fields as Array<Record<string, unknown>>;
	const parsedFields: FieldDefinition[] = Array.isArray(rawFields)
		? rawFields.map((f) => parseFieldDefinition(f))
		: [];

	const walrusBlobIdOption = parseOption<unknown>(fields.walrus_blob_id);
	const walrusBlobId =
		walrusBlobIdOption != null ? parseU256AsHex(walrusBlobIdOption) : null;

	return {
		id,
		creator: String(fields.creator ?? ""),
		name: decodeBytes(fields.name),
		description: decodeBytes(fields.description),
		fields: parsedFields,
		walrusBlobId,
		createdAt: Number(fields.created_at ?? 0),
	};
}

/**
 * Parse a FieldDefinition JSON object from the chain.
 */
export function parseFieldDefinition(
	raw: Record<string, unknown>,
): FieldDefinition {
	const fieldFields = (raw.fields as Record<string, unknown>) ?? raw;
	return {
		name: decodeBytes(fieldFields.name),
		fieldType: decodeBytes(fieldFields.field_type) as FieldDefinition["fieldType"],
		required: Boolean(fieldFields.required),
	};
}

/**
 * Parse a JSON object returned by the chain for an Attestation object.
 * The object must have the Move field names (snake_case).
 */
export function parseAttestationFields(
	id: string,
	fields: Record<string, unknown>,
): Attestation {
	const walrusBlobIdOption = parseOption<unknown>(fields.walrus_blob_id);
	const walrusBlobId =
		walrusBlobIdOption != null ? parseU256AsHex(walrusBlobIdOption) : null;

	const expiresAtOption = parseOption<unknown>(fields.expires_at);
	const expiresAt = expiresAtOption != null ? Number(expiresAtOption) : null;

	const sealAllowlistIdOption = parseOption<unknown>(fields.seal_allowlist_id);
	const sealAllowlistId =
		sealAllowlistIdOption != null ? String(sealAllowlistIdOption) : null;

	return {
		id,
		schemaId: String(fields.schema_id ?? ""),
		attester: String(fields.attester ?? ""),
		recipient: String(fields.recipient ?? ""),
		dataHash: parseBytesAsHex(fields.data_hash),
		walrusBlobId,
		createdAt: Number(fields.created_at ?? 0),
		expiresAt,
		isEncrypted: Boolean(fields.is_encrypted),
		sealAllowlistId,
	};
}

/**
 * Parse a GraphQL event's JSON into a typed event object.
 * Handles Move event fields which use snake_case naming.
 */
export function parseEventFields(
	raw: Record<string, unknown>,
): Record<string, unknown> {
	return raw;
}
