'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWalletConnection } from '@mysten/dapp-kit-react';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { AttestationCard } from '@/components/AttestationCard';
import { SUI_RPC_URLS, PACKAGE_ID } from '@/lib/constants';
import type { Attestation } from '@/lib/types';

type Tab = 'received' | 'issued';

async function fetchReceivedAttestations(address: string): Promise<Attestation[]> {
  const client = new SuiJsonRpcClient({ network: 'testnet', url: SUI_RPC_URLS.testnet });

  try {
    const objects = await client.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `${PACKAGE_ID}::attestation::Attestation`,
      },
      options: { showContent: true },
    });

    const results: Attestation[] = [];
    for (const obj of objects.data) {
      if (!obj.data?.content || obj.data.content.dataType !== 'moveObject') continue;
      const fields = obj.data.content.fields as Record<string, unknown>;
      results.push({
        id: obj.data.objectId,
        schemaId:
          (fields.schema_id as { id: string })?.id ?? (fields.schema_id as string),
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
      });
    }
    return results;
  } catch {
    return [];
  }
}

async function fetchIssuedAttestations(address: string): Promise<Attestation[]> {
  const client = new SuiJsonRpcClient({ network: 'testnet', url: SUI_RPC_URLS.testnet });

  try {
    const events = await client.queryEvents({
      query: {
        MoveEventType: `${PACKAGE_ID}::attestation::AttestationCreated`,
      },
      limit: 50,
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

      if (!parsed || parsed.attester !== address) continue;

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

export function MyAttestationsPanel() {
  const searchParams = useSearchParams();
  const { account, isConnected } = useWalletConnection();
  const [tab, setTab] = useState<Tab>('received');
  const [received, setReceived] = useState<Attestation[]>([]);
  const [issued, setIssued] = useState<Attestation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Support ?address= query param for external browsing
  const addressParam = searchParams.get('address');
  const activeAddress = addressParam ?? account?.address ?? null;

  useEffect(() => {
    if (!activeAddress) return;
    setIsLoading(true);

    Promise.all([
      fetchReceivedAttestations(activeAddress),
      fetchIssuedAttestations(activeAddress),
    ])
      .then(([r, i]) => {
        setReceived(r);
        setIssued(i);
      })
      .finally(() => setIsLoading(false));
  }, [activeAddress]);

  if (!activeAddress) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 py-16 text-center">
        <p className="text-zinc-500">Connect your wallet to see your attestations.</p>
      </div>
    );
  }

  const attestations = tab === 'received' ? received : issued;

  return (
    <div>
      {addressParam && (
        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-mono text-zinc-400">
          Showing attestations for: {activeAddress}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800 mb-6">
        {(['received', 'issued'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t}
            <span className="ml-2 rounded-full bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              {t === 'received' ? received.length : issued.length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 h-40 animate-pulse"
            />
          ))}
        </div>
      ) : attestations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <p className="text-zinc-500">
            No {tab} attestations found.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {attestations.map((attestation) => (
            <AttestationCard key={attestation.id} attestation={attestation} />
          ))}
        </div>
      )}
    </div>
  );
}
