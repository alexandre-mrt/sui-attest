import { Suspense } from 'react';
import Link from 'next/link';
import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { AttestationCard } from '@/components/AttestationCard';
import { PACKAGE_ID, SUI_GRAPHQL_URLS } from '@/lib/constants';
import type { Attestation } from '@/lib/types';
import { ExplorerSearch } from './ExplorerSearch';

const ATTESTATION_EVENTS_QUERY = `
  query GetAttestationEvents($eventType: String!, $cursor: String) {
    events(
      filter: { eventType: $eventType }
      first: 20
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

async function fetchRecentAttestations(): Promise<Attestation[]> {
  const gql = new SuiGraphQLClient({
    network: 'testnet',
    url: SUI_GRAPHQL_URLS.testnet,
  });

  try {
    const eventType = `${PACKAGE_ID}::attestation::AttestationCreated`;
    const result = await gql.query<EventsQueryResult>({
      query: ATTESTATION_EVENTS_QUERY,
      variables: { eventType },
    });

    const events = result.data?.events;
    if (!events) return [];

    const results: Attestation[] = [];
    for (const node of events.nodes) {
      const parsed = node.contents?.json;
      if (!parsed) continue;

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

export default async function ExplorerPage() {
  const attestations = await fetchRecentAttestations();

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-16 animate-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[1.75rem] font-medium text-text-primary leading-[1.3]">
          Explorer
        </h1>
        <p className="text-[0.875rem] text-text-secondary mt-1 leading-[1.6]">
          Browse and search on-chain attestations
        </p>
      </div>

      {/* Horizontal rule */}
      <div className="border-t border-border mb-8" />

      {/* Search */}
      <div className="mb-8">
        <Suspense>
          <ExplorerSearch />
        </Suspense>
      </div>

      {/* Recent attestations section */}
      <div>
        <h2 className="text-[0.8125rem] font-medium text-text-secondary mb-4 uppercase tracking-wider">
          Recent attestations
        </h2>

        {attestations.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center">
            <p className="font-display italic text-text-secondary">
              No attestations yet
            </p>
            <Link
              href="/attest"
              className="mt-4 inline-block text-[0.875rem] text-text-secondary hover:text-text-primary transition-colors duration-150"
            >
              Issue the first attestation
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {attestations.map((attestation) => (
              <AttestationCard key={attestation.id} attestation={attestation} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
