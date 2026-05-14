import { Suspense } from 'react';
import Link from 'next/link';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { AttestationCard } from '@/components/AttestationCard';
import { SUI_RPC_URLS, PACKAGE_ID } from '@/lib/constants';
import type { Attestation } from '@/lib/types';
import { ExplorerSearch } from './ExplorerSearch';

async function fetchRecentAttestations(): Promise<Attestation[]> {
  const client = new SuiJsonRpcClient({ network: 'testnet', url: SUI_RPC_URLS.testnet });

  try {
    const events = await client.queryEvents({
      query: { MoveEventType: `${PACKAGE_ID}::attestation::AttestationCreated` },
      limit: 20,
      order: 'descending',
    });

    const results: Attestation[] = [];
    for (const event of events.data) {
      const parsed = event.parsedJson as {
        attestation_id: string;
        schema_id: string;
        attester: string;
        recipient: string;
        walrus_blob_id: { vec: string[] };
        expires_at: { vec: string[] };
        timestamp: string;
      } | null;

      if (!parsed) continue;

      results.push({
        id: parsed.attestation_id,
        schemaId: parsed.schema_id,
        attester: parsed.attester,
        recipient: parsed.recipient,
        dataHash: '',
        walrusBlobId:
          parsed.walrus_blob_id?.vec?.length > 0
            ? parsed.walrus_blob_id.vec[0]
            : null,
        createdAt: Number(parsed.timestamp),
        expiresAt:
          parsed.expires_at?.vec?.length > 0
            ? Number(parsed.expires_at.vec[0])
            : null,
        isEncrypted: false,
      });
    }
    return results;
  } catch {
    return [];
  }
}

export default async function ExplorerPage() {
  const attestations = await fetchRecentAttestations();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Explorer</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Browse and search on-chain attestations
        </p>
      </div>

      <div className="mb-8">
        <Suspense>
          <ExplorerSearch />
        </Suspense>
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">
          Recent attestations
        </h2>

        {attestations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 py-16 text-center">
            <p className="text-zinc-500">No attestations found yet.</p>
            <Link
              href="/attest"
              className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300"
            >
              Issue the first attestation
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {attestations.map((attestation) => (
              <AttestationCard key={attestation.id} attestation={attestation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
