'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWalletConnection } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { AttestationCard } from '@/components/AttestationCard';
import { SUI_RPC_URLS, SUI_GRAPHQL_URLS, PACKAGE_ID } from '@/lib/constants';
import type { Attestation } from '@/lib/types';

type Tab = 'received' | 'issued';

const TABS: readonly Tab[] = ['received', 'issued'] as const;

const ATTESTATION_EVENTS_QUERY = `
  query GetAttestationEvents($eventType: String!, $cursor: String) {
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

async function fetchReceivedAttestations(address: string): Promise<Attestation[]> {
  const client = new SuiGrpcClient({ network: 'testnet', baseUrl: SUI_RPC_URLS.testnet });

  try {
    const attestationType = `${PACKAGE_ID}::attestation::Attestation`;
    const response = await client.listOwnedObjects({
      owner: address,
      type: attestationType,
      include: { json: true },
    });

    const results: Attestation[] = [];
    for (const obj of response.objects) {
      const json = obj.json as Record<string, unknown> | null;
      if (!json) continue;
      const fields = (json.fields as Record<string, unknown>) ?? json;
      results.push({
        id: obj.objectId,
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
  const gql = new SuiGraphQLClient({
    network: 'testnet',
    url: SUI_GRAPHQL_URLS.testnet,
  });

  try {
    const eventType = `${PACKAGE_ID}::attestation::AttestationCreated`;
    const queryResult = await gql.query<EventsQueryResult>({
      query: ATTESTATION_EVENTS_QUERY,
      variables: { eventType },
    });

    const events = queryResult.data?.events;
    if (!events) return [];

    const results: Attestation[] = [];
    for (const node of events.nodes) {
      const parsed = node.contents?.json;
      if (!parsed) continue;
      if (String(parsed.attester) !== address) continue;

      const walrusBlobVec = parsed.walrus_blob_id as { vec?: string[] } | undefined;
      const expiresAtVec = parsed.expires_at as { vec?: string[] } | undefined;

      results.push({
        id: String(parsed.attestation_id ?? ''),
        schemaId: String(parsed.schema_id ?? ''),
        attester: String(parsed.attester ?? ''),
        recipient: String(parsed.recipient ?? ''),
        dataHash: '',
        walrusBlobId:
          walrusBlobVec?.vec && walrusBlobVec.vec.length > 0
            ? walrusBlobVec.vec[0]
            : null,
        createdAt: Number(parsed.timestamp ?? 0),
        expiresAt:
          expiresAtVec?.vec && expiresAtVec.vec.length > 0
            ? Number(expiresAtVec.vec[0])
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
      <div className="border border-dashed border-border rounded-xl p-8 text-center">
        <p className="font-display italic text-text-secondary">
          Connect your wallet to see your attestations
        </p>
      </div>
    );
  }

  const attestations = tab === 'received' ? received : issued;

  return (
    <div>
      {/* Address banner for external browsing */}
      {addressParam && (
        <div className="mb-6 rounded-lg bg-bg-surface border border-border px-4 py-2.5 text-[0.875rem] font-mono text-text-secondary">
          Showing attestations for: {activeAddress}
        </div>
      )}

      {/* Tab bar */}
      <div className="inline-flex bg-bg-surface rounded-lg p-1 mb-8">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-[0.875rem] font-medium capitalize transition-all duration-150 ${
              tab === t
                ? 'bg-bg-hover text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t}
            <span
              className={`ml-2 inline-flex items-center justify-center min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-[0.6875rem] tabular-nums ${
                tab === t
                  ? 'bg-accent-muted text-accent'
                  : 'bg-bg-surface text-text-tertiary'
              }`}
            >
              {t === 'received' ? received.length : issued.length}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl bg-bg-hover h-40 animate-pulse"
            />
          ))}
        </div>
      ) : attestations.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center">
          <p className="font-display italic text-text-secondary">
            No {tab} attestations found
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {attestations.map((attestation) => (
            <AttestationCard key={attestation.id} attestation={attestation} />
          ))}
        </div>
      )}
    </div>
  );
}
