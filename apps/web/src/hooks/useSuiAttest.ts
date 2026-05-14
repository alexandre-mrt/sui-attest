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

export function useSuiAttest() {
  const dAppKit = useDAppKit();

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
    const { schemaId, recipient, data: attestData, expiresAt } = data;

    if (!schemaId.trim()) throw new Error('Schema ID is required');
    if (!recipient.trim()) throw new Error('Recipient address is required');

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
        tx.pure.option('u256', null),
        tx.pure.option('u64', expiresAtMs),
        tx.pure.bool(false),
        tx.object(CLOCK_ID),
      ],
    });

    const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
    if (result.$kind !== 'Transaction') {
      throw new Error('Transaction failed');
    }
    return result.Transaction.digest;
  };

  return { createSchema, issueAttestation };
}
