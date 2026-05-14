'use client';

import { useState } from 'react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { StatusBadge, deriveStatus } from '@/components/StatusBadge';
import { SUI_RPC_URLS, REVOCATION_REGISTRY_ID } from '@/lib/constants';
import { truncateAddress, formatTimestamp } from '@/lib/utils';
import type { Attestation, VerifyResult } from '@/lib/types';

const KEY_VALUE_CLASSES = 'flex justify-between items-baseline';
const LABEL_CLASSES = 'text-[0.8125rem] text-text-secondary';
const VALUE_CLASSES = 'text-[0.875rem] font-mono text-text-primary';

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
      {/* Search form */}
      <form onSubmit={handleVerify} className="flex gap-3">
        <input
          type="text"
          placeholder="Attestation ID (0x...)"
          value={attestationId}
          onChange={(e) => setAttestationId(e.target.value)}
          className="flex-1 font-mono bg-bg-input border border-border rounded-lg h-10 px-3 text-[0.875rem] text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-[2px] focus:ring-accent-muted transition-[border-color] duration-150"
        />
        <button
          type="submit"
          disabled={isLoading || !attestationId.trim()}
          className="bg-accent text-text-inverse rounded-lg h-10 px-4 text-[0.875rem] font-medium hover:bg-accent-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-revoked/20 bg-revoked/10 px-4 py-3 text-[0.875rem] text-revoked">
          {error}
        </div>
      )}

      {/* Result card */}
      {result && (
        <div className="bg-bg-surface border border-border rounded-xl p-5 space-y-5 animate-in">
          {/* Status header */}
          <div className="flex items-center gap-3">
            <StatusBadge
              status={deriveStatus({
                revoked: result.revoked,
                expiresAt: result.attestation?.expiresAt ?? null,
              })}
            />
            <span className="text-[0.875rem] text-text-secondary">
              {result.valid ? 'This attestation is valid' : ''}
              {result.revoked ? 'This attestation has been revoked' : ''}
              {result.expired && !result.revoked ? 'This attestation has expired' : ''}
            </span>
          </div>

          {/* Key-value pairs */}
          {result.attestation && (
            <dl className="space-y-3 border-t border-border pt-5">
              <div className={KEY_VALUE_CLASSES}>
                <dt className={LABEL_CLASSES}>Schema</dt>
                <dd className={VALUE_CLASSES}>
                  {truncateAddress(result.attestation.schemaId)}
                </dd>
              </div>
              <div className={KEY_VALUE_CLASSES}>
                <dt className={LABEL_CLASSES}>Attester</dt>
                <dd className={VALUE_CLASSES}>
                  {truncateAddress(result.attestation.attester)}
                </dd>
              </div>
              <div className={KEY_VALUE_CLASSES}>
                <dt className={LABEL_CLASSES}>Recipient</dt>
                <dd className={VALUE_CLASSES}>
                  {truncateAddress(result.attestation.recipient)}
                </dd>
              </div>
              <div className={KEY_VALUE_CLASSES}>
                <dt className={LABEL_CLASSES}>Issued</dt>
                <dd className="text-[0.875rem] text-text-primary">
                  {formatTimestamp(result.attestation.createdAt)}
                </dd>
              </div>
              {result.revokedAt && (
                <div className={KEY_VALUE_CLASSES}>
                  <dt className={LABEL_CLASSES}>Revoked at</dt>
                  <dd className="text-[0.875rem] text-text-primary">
                    {formatTimestamp(result.revokedAt)}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
