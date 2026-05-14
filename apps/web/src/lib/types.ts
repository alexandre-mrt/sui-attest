import type { FieldType } from './constants';

export interface FieldDefinition {
  name: string;
  fieldType: FieldType;
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

export interface RevocationRecord {
  attestationId: string;
  attester: string;
  revokedAt: number;
  reason: string;
}

export interface VerifyResult {
  valid: boolean;
  attestation: Attestation | null;
  revoked: boolean;
  expired: boolean;
  revokedAt?: number;
  reason?: string;
}

// Event shapes from Sui GraphQL
export interface SchemaCreatedEvent {
  schemaId: string;
  creator: string;
  name: string;
  walrusBlobId: string | null;
  timestamp: number;
}

export interface AttestationCreatedEvent {
  attestationId: string;
  schemaId: string;
  attester: string;
  recipient: string;
  walrusBlobId: string | null;
  expiresAt: number | null;
  timestamp: number;
}

// Form types
export interface CreateSchemaFormData {
  name: string;
  description: string;
  fields: FieldDefinition[];
  /** Optional schema document to store on Walrus (bytes from file input) */
  schemaDoc?: Uint8Array;
}

export interface AttestFormData {
  schemaId: string;
  recipient: string;
  data: Record<string, string>;
  expiresAt: string; // ISO date string or empty
  /** When true, attestation data is SEAL-encrypted before storing */
  encrypt?: boolean;
  /** Optional credential document to store on Walrus (bytes from file input) */
  credentialDoc?: Uint8Array;
}
