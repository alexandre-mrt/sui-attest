'use client';

import { useState } from 'react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { StatusBadge, deriveStatus } from '@/components/StatusBadge';
import { SUI_RPC_URLS, REVOCATION_REGISTRY_ID } from '@/lib/constants';
import { truncateAddress, formatTimestamp } from '@/lib/utils';
import type { Attestation, VerifyResult } from '@/lib/types';

export function VerifyPanel() {
  const [attestationId, setAttestationId] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = attestationId.trim();
    if (!id) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const client = new SuiGrpcClient({ network: 'testnet', baseUrl: SUI_RPC_URLS.testnet });

      // Fetch the attestation object via gRPC
      const { object: obj } = await client.getObject({
        objectId: id,
        include: { json: true },
      });

      const json = obj.json;
      if (!json) {
        throw new Error('Attestation not found or not a valid object');
      }

      const fields = (json.fields as Record<string, unknown>) ?? json;

      const attestation: Attestation = {
        id,
        schemaId: (fields.schema_id as { id: string })?.id ?? (fields.schema_id as string),
        attester: fields.attester as string,
        recipient: fields.recipient as string,
        dataHash: '',
        walrusBlobId: null,
        createdAt: Number(fields.created_at),
        expiresAt:
          (fields.expires_at as { vec: string[] })?.vec?.length > 0
            ? Number((fields.expires_at as { vec: string[] }).vec[0])
            : null,
        isEncrypted: fields.is_encrypted as boolean,
      };

      // Check revocation via dynamic field lookup
      let revoked = false;
      let revokedAt: number | undefined;

      try {
        // Convert the attestation ID to BCS bytes for dynamic field name
        const idHex = id.startsWith('0x') ? id.slice(2) : id;
        const padded = idHex.padStart(64, '0');
        const bcsBytes = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          bcsBytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
        }

        const { dynamicField } = await client.getDynamicField({
          parentId: REVOCATION_REGISTRY_ID,
          name: { type: '0x2::object::ID', bcs: bcsBytes },
        });
        if (dynamicField) {
          revoked = true;
          // Parse revoked_at from the BCS value if available
          // The value type is RevocationRecord which has a revoked_at: u64
        }
      } catch {
        revoked = false;
      }

      const expired =
        attestation.expiresAt !== null && attestation.expiresAt < Date.now();

      setResult({
        valid: !revoked && !expired,
        attestation,
        revoked,
        expired,
        revokedAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleVerify} className="flex gap-3">
        <input
          type="text"
          placeholder="Attestation ID (0x...)"
          value={attestationId}
          onChange={(e) => setAttestationId(e.target.value)}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        />
        <button
          type="submit"
          disabled={isLoading || !attestationId.trim()}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <StatusBadge
              status={deriveStatus({
                revoked: result.revoked,
                expiresAt: result.attestation?.expiresAt ?? null,
              })}
            />
            <span className="text-sm text-zinc-400">
              {result.valid ? 'This attestation is valid' : ''}
              {result.revoked ? 'This attestation has been revoked' : ''}
              {result.expired && !result.revoked ? 'This attestation has expired' : ''}
            </span>
          </div>

          {result.attestation && (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Schema</dt>
                <dd className="font-mono text-zinc-300">
                  {truncateAddress(result.attestation.schemaId)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Attester</dt>
                <dd className="font-mono text-zinc-300">
                  {truncateAddress(result.attestation.attester)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Recipient</dt>
                <dd className="font-mono text-zinc-300">
                  {truncateAddress(result.attestation.recipient)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Issued</dt>
                <dd className="text-zinc-300">
                  {formatTimestamp(result.attestation.createdAt)}
                </dd>
              </div>
              {result.revokedAt && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Revoked at</dt>
                  <dd className="text-zinc-300">{formatTimestamp(result.revokedAt)}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
