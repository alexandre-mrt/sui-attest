import { SuiGrpcClient } from "@mysten/sui/grpc";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { Transaction } from "@mysten/sui/transactions";
import type { Signer } from "@mysten/sui/cryptography";
import { WalrusClient } from "@mysten/walrus";

import type {
	SuiAttestConfig,
	Schema,
	Attestation,
	VerificationResult,
	FieldDefinition,
} from "./types.js";
import {
	MODULE_SCHEMA,
	MODULE_ATTESTATION,
	GRPC_URLS,
	GRAPHQL_ENDPOINTS,
	CLOCK_OBJECT_ID,
	WALRUS_EPOCHS,
} from "./constants.js";
import {
	parseSchemaRecord,
	parseAttestationFields,
	parseOption,
} from "./parsing.js";
import { hashData, buildFieldDefinitions, encodeString } from "./utils.js";
import { uploadToWalrus, readFromWalrus } from "./walrus.js";

// Unused import suppression — parseOption is re-exported from index
void parseOption;

const EVENTS_QUERY = `
  query GetEvents($eventType: String!, $cursor: String) {
    events(
      filter: { eventType: $eventType }
      first: 50
      after: $cursor
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        contents {
          json
        }
      }
    }
  }
`;

type EventsQueryResult = {
	events?: {
		pageInfo: { hasNextPage: boolean; endCursor?: string };
		nodes: Array<{
			contents?: { json?: Record<string, unknown> };
		}>;
	};
};

type DynamicFieldQueryResult = {
	object?: {
		dynamicField?: {
			value?: { json?: Record<string, unknown> };
		};
	};
};

export class SuiAttestClient {
	readonly grpc: SuiGrpcClient;
	readonly gql: SuiGraphQLClient;
	readonly config: SuiAttestConfig;
	readonly #walrus: WalrusClient | null;

	constructor(config: SuiAttestConfig) {
		this.config = config;

		const grpcUrl = GRPC_URLS[config.network] ?? GRPC_URLS["testnet"];
		this.grpc = new SuiGrpcClient({
			network: config.network,
			baseUrl: grpcUrl,
		});

		const gqlUrl =
			GRAPHQL_ENDPOINTS[config.network] ?? GRAPHQL_ENDPOINTS["testnet"];
		this.gql = new SuiGraphQLClient({
			network: config.network,
			url: gqlUrl,
		});

		// Walrus only supports mainnet and testnet
		if (config.network === "mainnet" || config.network === "testnet") {
			this.#walrus = new WalrusClient({
				network: config.network,
				suiClient: this.grpc,
			});
		} else {
			this.#walrus = null;
		}
	}

	// ── Walrus Operations (F004) ───────────────────────────────────────────

	/**
	 * Upload a document to Walrus and return the blob ID.
	 * Requires a signer to pay for storage. Only available on mainnet/testnet.
	 */
	async uploadToWalrus(data: Uint8Array, signer: Signer): Promise<string> {
		if (!this.#walrus) {
			throw new Error(
				`Walrus is not available on network: ${this.config.network}. Use mainnet or testnet.`,
			);
		}
		return uploadToWalrus(this.#walrus, data, signer, WALRUS_EPOCHS);
	}

	/**
	 * Read a document from Walrus by its blob ID.
	 * Only available on mainnet/testnet.
	 */
	async readFromWalrus(blobId: string): Promise<Uint8Array> {
		if (!this.#walrus) {
			throw new Error(
				`Walrus is not available on network: ${this.config.network}. Use mainnet or testnet.`,
			);
		}
		return readFromWalrus(this.#walrus, blobId);
	}

	// ── Schema Operations ──────────────────────────────────────────────────

	/**
	 * Build a Transaction to create a schema on-chain.
	 * If `walrusDoc` is provided along with a `signer`, the schema JSON is
	 * uploaded to Walrus first and the returned blob ID is stored on-chain.
	 * The caller must sign and execute the returned transaction.
	 */
	async createSchema(params: {
		name: string;
		description: string;
		fields: FieldDefinition[];
		walrusBlobId?: string | null;
		walrusDoc?: Uint8Array;
		signer?: Signer;
	}): Promise<{ transaction: Transaction; walrusBlobId?: string }> {
		let resolvedBlobId: string | null = params.walrusBlobId ?? null;

		if (params.walrusDoc != null && params.signer != null) {
			resolvedBlobId = await this.uploadToWalrus(
				params.walrusDoc,
				params.signer,
			);
		}

		const tx = new Transaction();
		const { fieldNames, fieldTypes, fieldRequired } = buildFieldDefinitions(
			params.fields,
		);

		const nameBytes = encodeString(params.name);
		const descBytes = encodeString(params.description);

		// walrus_blob_id: Option<u256>
		const walrusBlobId =
			resolvedBlobId != null
				? BigInt(
						resolvedBlobId.startsWith("0x")
							? resolvedBlobId
							: "0x" + resolvedBlobId,
					)
				: null;

		tx.moveCall({
			target: `${this.config.packageId}::${MODULE_SCHEMA}::create_schema`,
			arguments: [
				tx.object(this.config.schemaRegistryId),
				tx.pure.vector("u8", nameBytes),
				tx.pure.vector("u8", descBytes),
				tx.pure("vector<vector<u8>>", fieldNames),
				tx.pure("vector<vector<u8>>", fieldTypes),
				tx.pure.vector("bool", fieldRequired),
				tx.pure.option("u256", walrusBlobId),
				tx.object(CLOCK_OBJECT_ID),
			],
		});

		return {
			transaction: tx,
			...(resolvedBlobId != null ? { walrusBlobId: resolvedBlobId } : {}),
		};
	}

	/**
	 * Fetch a schema from the SchemaRegistry by its schema_id (table key).
	 *
	 * SchemaRecord lives in a Table<ID, SchemaRecord>
	 * as a dynamic field. We use GraphQL to fetch the JSON representation.
	 */
	async getSchema(schemaId: string): Promise<Schema> {
		return this.#getSchemaViaGraphQL(schemaId);
	}

	async #getSchemaViaGraphQL(schemaId: string): Promise<Schema> {
		const query = `
      query GetDynamicField($parentId: SuiAddress!, $keyType: String!, $keyBcs: Base64!) {
        object(address: $parentId) {
          dynamicField(name: { type: $keyType, bcs: $keyBcs }) {
            value {
              ... on MoveValue {
                json
              }
            }
          }
        }
      }
    `;

		const bcsBase64 = bytesToBase64(hexStringToBytes(schemaId));
		const result = await this.gql.query<DynamicFieldQueryResult>({
			query,
			variables: {
				parentId: this.config.schemaRegistryId,
				keyType: "0x2::object::ID",
				keyBcs: bcsBase64,
			},
		});

		const json = result.data?.object?.dynamicField?.value?.json;
		if (!json) {
			throw new Error(`Schema not found: ${schemaId}`);
		}

		return parseSchemaRecord(schemaId, json);
	}

	/**
	 * List schemas created by a given address using GraphQL event queries.
	 */
	async getSchemasByCreator(address: string): Promise<Schema[]> {
		const eventType = `${this.config.packageId}::${MODULE_SCHEMA}::SchemaCreated`;
		const schemaIds: string[] = [];
		let cursor: string | null = null;
		let hasMore = true;

		while (hasMore) {
			const queryResult: Awaited<ReturnType<typeof this.gql.query<EventsQueryResult>>> =
				await this.gql.query<EventsQueryResult>({
					query: EVENTS_QUERY,
					variables: { eventType, cursor },
				});

			const events: EventsQueryResult["events"] = queryResult.data?.events;
			if (!events) break;

			for (const node of events.nodes) {
				const json = node.contents?.json;
				if (!json) continue;
				if (String(json.creator).toLowerCase() !== address.toLowerCase()) {
					continue;
				}
				const sid = String(json.schema_id ?? "");
				if (sid) schemaIds.push(sid);
			}

			hasMore = events.pageInfo.hasNextPage;
			cursor = hasMore ? (events.pageInfo.endCursor ?? null) : null;
			if (!cursor) break;
		}

		const schemas = await Promise.allSettled(
			schemaIds.map((id) => this.getSchema(id)),
		);

		return schemas
			.filter(
				(r): r is PromiseFulfilledResult<Schema> => r.status === "fulfilled",
			)
			.map((r) => r.value);
	}

	// ── Attestation Operations ─────────────────────────────────────────────

	/**
	 * Build a Transaction to issue an attestation.
	 * If `walrusDoc` is provided along with a `signer`, the credential document
	 * is uploaded to Walrus first and the blob ID is stored on-chain.
	 * Returns the transaction, computed data hash, and optional Walrus blob ID.
	 */
	async attest(params: {
		schemaId: string;
		recipient: string;
		data: Record<string, unknown>;
		expiresAt?: number | null;
		walrusBlobId?: string | null;
		walrusDoc?: Uint8Array;
		signer?: Signer;
		isEncrypted?: boolean;
	}): Promise<{ transaction: Transaction; dataHash: string; walrusBlobId?: string }> {
		let resolvedBlobId: string | null = params.walrusBlobId ?? null;

		if (params.walrusDoc != null && params.signer != null) {
			resolvedBlobId = await this.uploadToWalrus(
				params.walrusDoc,
				params.signer,
			);
		}

		const { hex: dataHashHex, bytes: dataHashBytes } = await hashData(
			params.data,
		);

		const tx = new Transaction();

		const walrusBlobId =
			resolvedBlobId != null
				? BigInt(
						resolvedBlobId.startsWith("0x")
							? resolvedBlobId
							: "0x" + resolvedBlobId,
					)
				: null;

		const expiresAt = params.expiresAt ?? null;

		tx.moveCall({
			target: `${this.config.packageId}::${MODULE_ATTESTATION}::attest`,
			arguments: [
				tx.object(this.config.schemaRegistryId),
				tx.object(this.config.revocationRegistryId),
				tx.pure.address(params.schemaId),
				tx.pure.address(params.recipient),
				tx.pure.vector("u8", Array.from(dataHashBytes)),
				tx.pure.option("u256", walrusBlobId),
				tx.pure.option("u64", expiresAt != null ? BigInt(expiresAt) : null),
				tx.pure.bool(params.isEncrypted ?? false),
				tx.object(CLOCK_OBJECT_ID),
			],
		});

		return {
			transaction: tx,
			dataHash: dataHashHex,
			...(resolvedBlobId != null ? { walrusBlobId: resolvedBlobId } : {}),
		};
	}

	/**
	 * Verify an attestation: check revocation and expiry by reading
	 * the Attestation object and the RevocationRegistry dynamic field.
	 */
	async verify(attestationId: string): Promise<VerificationResult> {
		const attestation = await this.getAttestation(attestationId);

		const revocationQuery = `
      query CheckRevocation($parentId: SuiAddress!, $keyType: String!, $keyBcs: Base64!) {
        object(address: $parentId) {
          dynamicField(name: { type: $keyType, bcs: $keyBcs }) {
            value {
              ... on MoveValue {
                json
              }
            }
          }
        }
      }
    `;

		const bcsBase64 = bytesToBase64(hexStringToBytes(attestationId));
		const revokeResult = await this.gql.query<DynamicFieldQueryResult>({
			query: revocationQuery,
			variables: {
				parentId: this.config.revocationRegistryId,
				keyType: "0x2::object::ID",
				keyBcs: bcsBase64,
			},
		});

		const revocationJson =
			revokeResult.data?.object?.dynamicField?.value?.json ?? null;
		const revoked = revocationJson != null;

		const nowMs = Date.now();
		const expired =
			attestation.expiresAt != null && nowMs >= attestation.expiresAt;

		const valid = !revoked && !expired;

		return {
			valid,
			attestation,
			revoked,
			expired,
			revokedAt: revoked
				? Number(revocationJson?.revoked_at ?? 0)
				: undefined,
			reason: revoked
				? decodeVectorU8(revocationJson?.reason)
				: undefined,
		};
	}

	/**
	 * Build a Transaction to revoke an attestation.
	 */
	revoke(params: { attestationId: string; reason?: string }): Transaction {
		const tx = new Transaction();
		const reasonBytes = encodeString(params.reason ?? "");

		tx.moveCall({
			target: `${this.config.packageId}::${MODULE_ATTESTATION}::revoke`,
			arguments: [
				tx.object(this.config.revocationRegistryId),
				tx.object(params.attestationId),
				tx.pure.vector("u8", reasonBytes),
				tx.object(CLOCK_OBJECT_ID),
			],
		});

		return tx;
	}

	/**
	 * Fetch an Attestation object by its ID.
	 */
	async getAttestation(attestationId: string): Promise<Attestation> {
		const response = await this.grpc.getObject({
			objectId: attestationId,
			include: { json: true },
		});

		const obj = response.object;
		if (!obj) {
			throw new Error(`Attestation not found: ${attestationId}`);
		}

		const json = obj.json as Record<string, unknown> | null;
		if (!json) {
			throw new Error(
				`Attestation object has no JSON content: ${attestationId}`,
			);
		}

		const fields = (json.fields as Record<string, unknown>) ?? json;
		return parseAttestationFields(attestationId, fields);
	}

	/**
	 * List attestations owned by an address (received by them).
	 */
	async getAttestationsByRecipient(address: string): Promise<Attestation[]> {
		const attestationType = `${this.config.packageId}::${MODULE_ATTESTATION}::Attestation`;
		const attestations: Attestation[] = [];
		let cursor: string | null = null;
		let hasMore = true;

		while (hasMore) {
			// Explicit type to avoid TS7022 circular initializer inference
			const response: Awaited<ReturnType<typeof this.grpc.listOwnedObjects<{ json: true }>>> =
				await this.grpc.listOwnedObjects({
					owner: address,
					type: attestationType,
					cursor,
					include: { json: true },
				});

			for (const obj of response.objects) {
				const json = obj.json as Record<string, unknown> | null;
				if (!json) continue;
				const fields = (json.fields as Record<string, unknown>) ?? json;
				attestations.push(parseAttestationFields(obj.objectId, fields));
			}

			hasMore = response.hasNextPage;
			cursor = hasMore ? response.cursor : null;
			if (!cursor) break;
		}

		return attestations;
	}

	/**
	 * List attestations issued by an address using GraphQL event queries.
	 */
	async getAttestationsByAttester(address: string): Promise<Attestation[]> {
		const eventType = `${this.config.packageId}::${MODULE_ATTESTATION}::AttestationCreated`;
		const attestationIds: string[] = [];
		let cursor: string | null = null;
		let hasMore = true;

		while (hasMore) {
			const queryResult: Awaited<ReturnType<typeof this.gql.query<EventsQueryResult>>> =
				await this.gql.query<EventsQueryResult>({
					query: EVENTS_QUERY,
					variables: { eventType, cursor },
				});

			const events: EventsQueryResult["events"] = queryResult.data?.events;
			if (!events) break;

			for (const node of events.nodes) {
				const json = node.contents?.json;
				if (!json) continue;
				if (
					String(json.attester).toLowerCase() !== address.toLowerCase()
				) {
					continue;
				}
				const aid = String(json.attestation_id ?? "");
				if (aid) attestationIds.push(aid);
			}

			hasMore = events.pageInfo.hasNextPage;
			cursor = hasMore ? (events.pageInfo.endCursor ?? null) : null;
			if (!cursor) break;
		}

		const results = await Promise.allSettled(
			attestationIds.map((id) => this.getAttestation(id)),
		);

		return results
			.filter(
				(r): r is PromiseFulfilledResult<Attestation> =>
					r.status === "fulfilled",
			)
			.map((r) => r.value);
	}
}

// ── Internal helpers ───────────────────────────────────────────────────────

/**
 * Convert a 0x-prefixed hex string (32 bytes / 64 hex chars) to a Uint8Array.
 */
function hexStringToBytes(hex: string): Uint8Array {
	const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
	const padded = normalized.padStart(64, "0");
	const bytes = new Uint8Array(32);
	for (let i = 0; i < 32; i++) {
		bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

/**
 * Convert a Uint8Array to a base64 string.
 */
function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

/**
 * Decode a Move vector<u8> field (array of numbers) into a UTF-8 string.
 */
function decodeVectorU8(raw: unknown): string {
	if (!Array.isArray(raw)) return "";
	return new TextDecoder().decode(new Uint8Array(raw as number[]));
}
