'use client';

import { useDAppKit } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import {
  PACKAGE_ID,
  SCHEMA_REGISTRY_ID,
  CLOCK_ID,
} from '@/lib/constants';
import type { CreateSchemaFormData, AttestFormData } from '@/lib/types';
import { sha256Hex } from '@/lib/utils';
import { useSeal } from './useSeal';

export function useSuiAttest() {
  const dAppKit = useDAppKit();
  const seal = useSeal();

  const createSchema = async (data: CreateSchemaFormData): Promise<string> => {
    const { name, description, fields } = data;

    if (!name.trim()) throw new Error('Schema name is required');
    if (fields.length === 0) throw new Error('At least one field is required');

    const encoder = new TextEncoder();

    // vector<vector<u8>> is number[][] in the pure API
    const fieldNames: number[][] = fields.map((f) => Array.from(encoder.encode(f.name)));
    const fieldTypes: number[][] = fields.map((f) => Array.from(encoder.encode(f.fieldType)));
    const fieldRequired: boolean[] = fields.map((f) => f.required);

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::schema::create_schema`,
      arguments: [
        tx.object(SCHEMA_REGISTRY_ID),
        tx.pure.vector('u8', Array.from(encoder.encode(name))),
        tx.pure.vector('u8', Array.from(encoder.encode(description))),
        tx.pure('vector<vector<u8>>', fieldNames),
        tx.pure('vector<vector<u8>>', fieldTypes),
        tx.pure('vector<bool>', fieldRequired),
        tx.pure.option('u256', null),
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
    const { schemaId, recipient, data: attestData, expiresAt, encrypt } = data;

    if (!schemaId.trim()) throw new Error('Schema ID is required');
    if (!recipient.trim()) throw new Error('Recipient address is required');

    let walrusBlobIdBigInt: bigint | null = null;
    let isEncrypted = false;

    if (encrypt) {
      // Encrypted flow: create allowlist → add recipient → encrypt → (Walrus upload skipped for now)
      // Walrus upload is not implemented in this iteration.
      // The encrypted bytes are generated but not uploaded. This requires Walrus client setup.
      // For now we create the allowlist and set isEncrypted=true without uploading.

      const allowlistId = await seal.createAllowlist();

      // Wait for key server propagation (SEAL anti-pattern: lag after object creation)
      await new Promise((r) => setTimeout(r, 3000));

      await seal.addVerifier(allowlistId, recipient);

      // Encrypt the attestation data
      const dataBytes = new TextEncoder().encode(JSON.stringify(attestData));
      const { encryptedBytes: _encryptedBytes } = await seal.encrypt(dataBytes, allowlistId);

      // TODO: upload _encryptedBytes to Walrus and set walrusBlobIdBigInt
      // walrusBlobIdBigInt = BigInt('0x' + walrusUpload(_encryptedBytes));
      isEncrypted = true;
    }

    const dataBytes = new TextEncoder().encode(JSON.stringify(attestData));
    const dataHashHex = await sha256Hex(dataBytes as Uint8Array<ArrayBuffer>);
    const dataHashArray = Array.from(
      dataHashHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
    );

    const expiresAtMs: bigint | null =
      expiresAt ? BigInt(new Date(expiresAt).getTime()) : null;

    const tx = new Transaction();

    tx.moveCall({
      target: `${PACKAGE_ID}::attestation::attest`,
      arguments: [
        tx.object(SCHEMA_REGISTRY_ID),
        tx.pure.id(schemaId),
        tx.pure.address(recipient),
        tx.pure.vector('u8', dataHashArray),
        tx.pure.option('u256', walrusBlobIdBigInt),
        tx.pure.option('u64', expiresAtMs),
        tx.pure.bool(isEncrypted),
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
