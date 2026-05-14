export interface FieldDefinition {
	name: string;
	fieldType: "string" | "u64" | "bool" | "address" | "bytes";
	required: boolean;
}

export interface Schema {
	id: string;
	creator: string;
	name: string;
	description: string;
	fields: FieldDefinition[];
	walrusBlobId: string | null;
	createdAt: number;
}

export interface Attestation {
	id: string;
	schemaId: string;
	attester: string;
	recipient: string;
	dataHash: string;
	walrusBlobId: string | null;
	createdAt: number;
	expiresAt: number | null;
	isEncrypted: boolean;
}

export interface VerificationResult {
	valid: boolean;
	attestation: Attestation;
	revoked: boolean;
	expired: boolean;
	revokedAt?: number;
	reason?: string;
}

export interface SuiAttestConfig {
	network: "mainnet" | "testnet" | "devnet";
	packageId: string;
	schemaRegistryId: string;
	revocationRegistryId: string;
}
