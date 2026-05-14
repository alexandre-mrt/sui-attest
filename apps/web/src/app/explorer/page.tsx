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
