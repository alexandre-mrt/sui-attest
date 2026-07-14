'use client';

import { useDAppKit } from '@mysten/dapp-kit-react';
import { CurrentAccountSigner } from '@mysten/dapp-kit-core';
import { WalrusClient, RetryableWalrusClientError, blobIdToInt } from '@mysten/walrus';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import {
  PACKAGE_ID,
  SCHEMA_REGISTRY_ID,
  REVOCATION_REGISTRY_ID,
  CLOCK_ID,
  NETWORK,
  SUI_RPC_URLS,
  WALRUS_EPOCHS,
} from '@/lib/constants';
import type { CreateSchemaFormData, AttestFormData } from '@/lib/types';
import { hashAttestData } from '@/lib/utils';
import { useSeal } from './useSeal';

const MAX_WALRUS_RETRIES = 3;

/**
 * Upload bytes to Walrus using the writeBlob API.
 * Returns the blobId as a bigint (u256) or null on failure.
 */
async function walrusUpload(
  client: WalrusClient,
  data: Uint8Array,
  signer: InstanceType<typeof CurrentAccountSigner>,
): Promise<bigint | null> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_WALRUS_RETRIES; attempt++) {
    try {
      const { blobId } = await client.writeBlob({
        blob: data,
        deletable: false,
        epochs: WALRUS_EPOCHS,
        signer,
      });
      return blobIdToInt(blobId);
    } catch (err) {
      if (err instanceof RetryableWalrusClientError) {
        client.reset();
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }
      throw err;
    }
  }
  throw lastError ?? new Error('Walrus upload failed after max retries');
}

export function useSuiAttest() {
  const dAppKit = useDAppKit();
  const seal = useSeal();

  const createSchema = async (data: CreateSchemaFormData): Promise<string> => {
    const { name, description, fields, schemaDoc } = data;

    if (!name.trim()) throw new Error('Schema name is required');
    if (fields.length === 0) throw new Error('At least one field is required');

    const encoder = new TextEncoder();

    // vector<vector<u8>> is number[][] in the pure API
    const fieldNames: number[][] = fields.map((f) => Array.from(encoder.encode(f.name)));
    const fieldTypes: number[][] = fields.map((f) => Array.from(encoder.encode(f.fieldType)));
    const fieldRequired: boolean[] = fields.map((f) => f.required);

    // Upload schema document to Walrus if provided
    let walrusBlobIdBigInt: bigint | null = null;
    if (schemaDoc != null && schemaDoc.length > 0 && (NETWORK === 'testnet' || NETWORK === 'mainnet')) {
      const suiClient = new SuiGrpcClient({ network: NETWORK, baseUrl: SUI_RPC_URLS[NETWORK] });
      const walrusClient = new WalrusClient({ network: NETWORK, suiClient });
      const signer = new CurrentAccountSigner(dAppKit);
      walrusBlobIdBigInt = await walrusUpload(walrusClient, schemaDoc, signer);
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::schema::create_schema`,
      arguments: [
        tx.object(SCHEMA_REGISTRY_ID),
        tx.pure.vector('u8', Array.from(encoder.encode(name))),
        tx.pure.vector('u8', Array.from(encoder.encode(description))),
        tx.pure(bcs.vector(bcs.vector(bcs.U8)).serialize(fieldNames)),
        tx.pure(bcs.vector(bcs.vector(bcs.U8)).serialize(fieldTypes)),
        tx.pure(bcs.vector(bcs.Bool).serialize(fieldRequired)),
        tx.pure.option('u256', walrusBlobIdBigInt),
        tx.object(CLOCK_ID),
      ],
    });

    const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
    if (result.$kind !== 'Transaction') {
      throw new Error('Transaction failed');
    }
    return result.Transaction.digest;
  };

  const issueAttestation = async (data: AttestFormData): Promise<string> => {
    const { schemaId, recipient, data: attestData, expiresAt, encrypt, credentialDoc } = data;

    if (!schemaId.trim()) throw new Error('Schema ID is required');
    if (!recipient.trim()) throw new Error('Recipient address is required');

    let walrusBlobIdBigInt: bigint | null = null;
    let isEncrypted = false;
    let sealAllowlistId: string | null = null;

    if (encrypt) {
      // Encrypted flow: create allowlist → add recipient → encrypt → upload to Walrus
      const allowlistId = await seal.createAllowlist();
      sealAllowlistId = allowlistId;

      // Wait for key server propagation (SEAL anti-pattern: lag after object creation)
      await new Promise((r) => setTimeout(r, 3000));

      await seal.addVerifier(allowlistId, recipient);

      // Encrypt the attestation data
      const { stableStringify } = await import('@/lib/utils');
      const dataBytes = new TextEncoder().encode(stableStringify(attestData));
      const { encryptedBytes } = await seal.encrypt(dataBytes, allowlistId);

      // Upload encrypted bytes to Walrus
      if (NETWORK === 'testnet' || NETWORK === 'mainnet') {
        const suiClient = new SuiGrpcClient({ network: NETWORK, baseUrl: SUI_RPC_URLS[NETWORK] });
        const walrusClient = new WalrusClient({ network: NETWORK, suiClient });
        const signer = new CurrentAccountSigner(dAppKit);
        walrusBlobIdBigInt = await walrusUpload(walrusClient, encryptedBytes, signer);
      }
      isEncrypted = true;
    } else if (credentialDoc != null && credentialDoc.length > 0 && (NETWORK === 'testnet' || NETWORK === 'mainnet')) {
      // Plain credential document upload
      const suiClient = new SuiGrpcClient({ network: NETWORK, baseUrl: SUI_RPC_URLS[NETWORK] });
      const walrusClient = new WalrusClient({ network: NETWORK, suiClient });
      const signer = new CurrentAccountSigner(dAppKit);
      walrusBlobIdBigInt = await walrusUpload(walrusClient, credentialDoc, signer);
    }

    const { bytes: dataHashBytes } = await hashAttestData(attestData);
    const dataHashArray = Array.from(dataHashBytes);

    const expiresAtMs: bigint | null =
      expiresAt ? BigInt(new Date(expiresAt).getTime()) : null;

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::attestation::attest`,
      arguments: [
        tx.object(SCHEMA_REGISTRY_ID),
        tx.object(REVOCATION_REGISTRY_ID),
        tx.pure.id(schemaId),
        tx.pure.address(recipient),
        tx.pure.vector('u8', dataHashArray),
        tx.pure.option('u256', walrusBlobIdBigInt),
        tx.pure.option('u64', expiresAtMs),
        tx.pure.bool(isEncrypted),
        tx.pure.option('address', sealAllowlistId),
        tx.object(CLOCK_ID),
      ],
    });

    const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
    if (result.$kind !== 'Transaction') {
      throw new Error('Transaction failed');
    }
    return result.Transaction.digest;
  };

  return { createSchema, issueAttestation, seal };
}
