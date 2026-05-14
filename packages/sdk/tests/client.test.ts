import { describe, it, expect, beforeEach } from "bun:test";
import { SuiAttestClient } from "../src/client.js";
import { TESTNET_CONFIG } from "../src/constants.js";
import {
	hashData,
	buildFieldDefinitions,
	encodeString,
} from "../src/utils.js";
import {
	parseOption,
	parseSchemaRecord,
	parseAttestationFields,
	parseFieldDefinition,
	decodeBytes,
	parseBytesAsHex,
	parseU256AsHex,
} from "../src/parsing.js";
import type { FieldDefinition, SuiAttestConfig } from "../src/types.js";

// ── Shared test config ─────────────────────────────────────────────────────

const TEST_CONFIG: SuiAttestConfig = {
	network: "testnet",
	packageId: TESTNET_CONFIG.packageId,
	schemaRegistryId: TESTNET_CONFIG.schemaRegistryId,
	revocationRegistryId: TESTNET_CONFIG.revocationRegistryId,
};

const SAMPLE_FIELDS: FieldDefinition[] = [
	{ name: "country", fieldType: "string", required: true },
	{ name: "level", fieldType: "u64", required: true },
	{ name: "expiry", fieldType: "u64", required: false },
];

// ── parseOption ────────────────────────────────────────────────────────────

describe("parseOption", () => {
	it("returns null for empty vec", () => {
		expect(parseOption({ vec: [] })).toBeNull();
	});

	it("returns the value for non-empty vec", () => {
		expect(parseOption<number>({ vec: [42] })).toBe(42);
	});

	it("returns null for null input", () => {
		expect(parseOption(null)).toBeNull();
	});

	it("returns null for undefined input", () => {
		expect(parseOption(undefined)).toBeNull();
	});

	it("handles string values", () => {
		expect(parseOption<string>({ vec: ["hello"] })).toBe("hello");
	});
});

// ── decodeBytes ────────────────────────────────────────────────────────────

describe("decodeBytes", () => {
	it("decodes number array to string", () => {
		const bytes = Array.from(new TextEncoder().encode("hello"));
		expect(decodeBytes(bytes)).toBe("hello");
	});

	it("returns string as-is", () => {
		expect(decodeBytes("world")).toBe("world");
	});

	it("returns empty string for null", () => {
		expect(decodeBytes(null)).toBe("");
	});
});

// ── parseBytesAsHex ────────────────────────────────────────────────────────

describe("parseBytesAsHex", () => {
	it("converts number array to hex string", () => {
		expect(parseBytesAsHex([0, 255, 16])).toBe("00ff10");
	});

	it("returns empty string for non-array", () => {
		expect(parseBytesAsHex(null)).toBe("");
	});
});

// ── parseU256AsHex ─────────────────────────────────────────────────────────

describe("parseU256AsHex", () => {
	it("converts decimal string to hex", () => {
		expect(parseU256AsHex("255")).toBe("0xff");
	});

	it("converts number to hex", () => {
		expect(parseU256AsHex(16)).toBe("0x10");
	});

	it("returns null for null", () => {
		expect(parseU256AsHex(null)).toBeNull();
	});
});

// ── parseFieldDefinition ───────────────────────────────────────────────────

describe("parseFieldDefinition", () => {
	it("parses field definition from Move JSON", () => {
		const nameBytes = Array.from(new TextEncoder().encode("country"));
		const typeBytes = Array.from(new TextEncoder().encode("string"));
		const raw = {
			fields: {
				name: nameBytes,
				field_type: typeBytes,
				required: true,
			},
		};
		const result = parseFieldDefinition(raw);
		expect(result.name).toBe("country");
		expect(result.fieldType).toBe("string");
		expect(result.required).toBe(true);
	});

	it("handles false required flag", () => {
		const nameBytes = Array.from(new TextEncoder().encode("expiry"));
		const typeBytes = Array.from(new TextEncoder().encode("u64"));
		const raw = {
			fields: {
				name: nameBytes,
				field_type: typeBytes,
				required: false,
			},
		};
		const result = parseFieldDefinition(raw);
		expect(result.required).toBe(false);
	});
});

// ── parseSchemaRecord ──────────────────────────────────────────────────────

describe("parseSchemaRecord", () => {
	it("parses a complete schema record", () => {
		const nameBytes = Array.from(new TextEncoder().encode("KYC Schema"));
		const descBytes = Array.from(new TextEncoder().encode("KYC verification"));
		const fieldNameBytes = Array.from(new TextEncoder().encode("country"));
		const fieldTypeBytes = Array.from(new TextEncoder().encode("string"));

		const raw = {
			creator: "0xabc",
			name: nameBytes,
			description: descBytes,
			fields: [
				{
					fields: {
						name: fieldNameBytes,
						field_type: fieldTypeBytes,
						required: true,
					},
				},
			],
			walrus_blob_id: { vec: [] },
			created_at: "1715644800000",
		};

		const result = parseSchemaRecord("0x1234", raw);
		expect(result.id).toBe("0x1234");
		expect(result.creator).toBe("0xabc");
		expect(result.name).toBe("KYC Schema");
		expect(result.description).toBe("KYC verification");
		expect(result.fields).toHaveLength(1);
		expect(result.fields[0].name).toBe("country");
		expect(result.walrusBlobId).toBeNull();
		expect(result.createdAt).toBe(1715644800000);
	});

	it("parses walrusBlobId when present", () => {
		const nameBytes = Array.from(new TextEncoder().encode("Test"));
		const descBytes = Array.from(new TextEncoder().encode("Test desc"));
		const raw = {
			creator: "0xabc",
			name: nameBytes,
			description: descBytes,
			fields: [],
			walrus_blob_id: { vec: ["255"] },
			created_at: "0",
		};

		const result = parseSchemaRecord("0x1", raw);
		expect(result.walrusBlobId).toBe("0xff");
	});
});

// ── parseAttestationFields ─────────────────────────────────────────────────

describe("parseAttestationFields", () => {
	it("parses a complete attestation object", () => {
		const dataHash = Array.from({ length: 32 }, (_, i) => i);
		const raw = {
			schema_id: "0xschema",
			attester: "0xattester",
			recipient: "0xrecipient",
			data_hash: dataHash,
			walrus_blob_id: { vec: [] },
			created_at: "1715644800000",
			expires_at: { vec: [] },
			is_encrypted: false,
		};

		const result = parseAttestationFields("0xattest", raw);
		expect(result.id).toBe("0xattest");
		expect(result.schemaId).toBe("0xschema");
		expect(result.attester).toBe("0xattester");
		expect(result.recipient).toBe("0xrecipient");
		expect(result.dataHash).toHaveLength(64); // 32 bytes = 64 hex chars
		expect(result.walrusBlobId).toBeNull();
		expect(result.createdAt).toBe(1715644800000);
		expect(result.expiresAt).toBeNull();
		expect(result.isEncrypted).toBe(false);
	});

	it("parses optional expiresAt when present", () => {
		const raw = {
			schema_id: "0x1",
			attester: "0xa",
			recipient: "0xb",
			data_hash: [],
			walrus_blob_id: { vec: [] },
			created_at: "0",
			expires_at: { vec: ["1747180800000"] },
			is_encrypted: false,
		};

		const result = parseAttestationFields("0x2", raw);
		expect(result.expiresAt).toBe(1747180800000);
	});
});

// ── hashData ───────────────────────────────────────────────────────────────

describe("hashData", () => {
	it("returns 32 bytes (64 hex chars)", async () => {
		const { hex, bytes } = await hashData({ country: "CH", level: 3 });
		expect(hex).toHaveLength(64);
		expect(bytes).toHaveLength(32);
	});

	it("produces deterministic output for same input", async () => {
		const data = { country: "CH", level: 3 };
		const result1 = await hashData(data);
		const result2 = await hashData(data);
		expect(result1.hex).toBe(result2.hex);
	});

	it("produces different hashes for different inputs", async () => {
		const r1 = await hashData({ a: 1 });
		const r2 = await hashData({ a: 2 });
		expect(r1.hex).not.toBe(r2.hex);
	});

	it("is key-order independent (sorts keys)", async () => {
		const r1 = await hashData({ a: 1, b: 2 });
		const r2 = await hashData({ b: 2, a: 1 });
		expect(r1.hex).toBe(r2.hex);
	});
});

// ── buildFieldDefinitions ──────────────────────────────────────────────────

describe("buildFieldDefinitions", () => {
	it("returns parallel vectors of correct length", () => {
		const { fieldNames, fieldTypes, fieldRequired } =
			buildFieldDefinitions(SAMPLE_FIELDS);
		expect(fieldNames).toHaveLength(3);
		expect(fieldTypes).toHaveLength(3);
		expect(fieldRequired).toHaveLength(3);
	});

	it("encodes field names as byte arrays", () => {
		const { fieldNames } = buildFieldDefinitions(SAMPLE_FIELDS);
		const decoded = new TextDecoder().decode(new Uint8Array(fieldNames[0]));
		expect(decoded).toBe("country");
	});

	it("encodes field types as byte arrays", () => {
		const { fieldTypes } = buildFieldDefinitions(SAMPLE_FIELDS);
		const decoded = new TextDecoder().decode(new Uint8Array(fieldTypes[0]));
		expect(decoded).toBe("string");
	});

	it("preserves required flags", () => {
		const { fieldRequired } = buildFieldDefinitions(SAMPLE_FIELDS);
		expect(fieldRequired[0]).toBe(true);
		expect(fieldRequired[2]).toBe(false);
	});
});

// ── encodeString ───────────────────────────────────────────────────────────

describe("encodeString", () => {
	it("encodes ASCII string to number array", () => {
		const result = encodeString("hello");
		expect(result).toEqual([104, 101, 108, 108, 111]);
	});

	it("encodes empty string to empty array", () => {
		expect(encodeString("")).toEqual([]);
	});
});

// ── SuiAttestClient construction ───────────────────────────────────────────

describe("SuiAttestClient", () => {
	let client: SuiAttestClient;

	beforeEach(() => {
		client = new SuiAttestClient(TEST_CONFIG);
	});

	it("constructs without throwing", () => {
		expect(client).toBeDefined();
	});

	it("exposes config", () => {
		expect(client.config.packageId).toBe(TEST_CONFIG.packageId);
		expect(client.config.network).toBe("testnet");
	});

	it("exposes grpc client", () => {
		expect(client.grpc).toBeDefined();
	});

	it("exposes gql client", () => {
		expect(client.gql).toBeDefined();
	});

	// ── createSchema transaction building ──────────────────────────────────

	describe("createSchema", () => {
		it("returns a transaction and optional walrusBlobId", async () => {
			const result = await client.createSchema({
				name: "KYC Schema",
				description: "KYC verification attestation",
				fields: SAMPLE_FIELDS,
			});
			expect(result).toBeDefined();
			expect(result.transaction).toBeDefined();
			// Transaction has a getData() method
			expect(typeof result.transaction.getData).toBe("function");
			expect(result.walrusBlobId).toBeUndefined();
		});

		it("builds transaction without walrusBlobId", async () => {
			const { transaction } = await client.createSchema({
				name: "Test",
				description: "Desc",
				fields: [{ name: "x", fieldType: "string", required: true }],
			});
			const data = transaction.getData();
			expect(data).toBeDefined();
		});

		it("builds transaction with walrusBlobId", async () => {
			const { transaction, walrusBlobId } = await client.createSchema({
				name: "Test",
				description: "Desc",
				fields: [{ name: "x", fieldType: "string", required: true }],
				walrusBlobId: "0xff",
			});
			const data = transaction.getData();
			expect(data).toBeDefined();
			expect(walrusBlobId).toBe("0xff");
		});
	});

	// ── attest transaction building ────────────────────────────────────────

	describe("attest", () => {
		const MOCK_SCHEMA_ID =
			"0x0000000000000000000000000000000000000000000000000000000000001234";
		const MOCK_RECIPIENT =
			"0x0000000000000000000000000000000000000000000000000000000000000001";

		it("returns a Transaction and dataHash", async () => {
			const { transaction, dataHash } = await client.attest({
				schemaId: MOCK_SCHEMA_ID,
				recipient: MOCK_RECIPIENT,
				data: { country: "CH", level: 3 },
			});
			expect(transaction).toBeDefined();
			expect(dataHash).toHaveLength(64);
		});

		it("dataHash is a valid 64-char hex string", async () => {
			const { dataHash } = await client.attest({
				schemaId: MOCK_SCHEMA_ID,
				recipient: MOCK_RECIPIENT,
				data: { name: "Alice" },
			});
			expect(/^[0-9a-f]{64}$/.test(dataHash)).toBe(true);
		});

		it("builds transaction with expiresAt", async () => {
			const futureMs = Date.now() + 86400000;
			const { transaction } = await client.attest({
				schemaId: MOCK_SCHEMA_ID,
				recipient: MOCK_RECIPIENT,
				data: { name: "Bob" },
				expiresAt: futureMs,
			});
			expect(transaction.getData()).toBeDefined();
		});

		it("builds transaction with isEncrypted flag", async () => {
			const { transaction } = await client.attest({
				schemaId: MOCK_SCHEMA_ID,
				recipient: MOCK_RECIPIENT,
				data: { name: "Bob" },
				isEncrypted: true,
			});
			expect(transaction.getData()).toBeDefined();
		});
	});

	// ── revoke transaction building ────────────────────────────────────────

	describe("revoke", () => {
		const MOCK_ATTESTATION_ID =
			"0x0000000000000000000000000000000000000000000000000000000000005678";

		it("returns a Transaction", () => {
			const tx = client.revoke({
				attestationId: MOCK_ATTESTATION_ID,
			});
			expect(tx).toBeDefined();
			expect(typeof tx.getData).toBe("function");
		});

		it("builds transaction with reason", () => {
			const tx = client.revoke({
				attestationId: MOCK_ATTESTATION_ID,
				reason: "Fraud detected",
			});
			expect(tx.getData()).toBeDefined();
		});

		it("builds transaction without reason (defaults to empty)", () => {
			const tx = client.revoke({
				attestationId: MOCK_ATTESTATION_ID,
			});
			expect(tx.getData()).toBeDefined();
		});
	});
});
