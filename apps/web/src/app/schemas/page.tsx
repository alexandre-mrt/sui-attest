import Link from 'next/link';
import { SuiGraphQLClient } from '@mysten/sui/graphql';
import { SchemaCard } from '@/components/SchemaCard';
import { PACKAGE_ID, SUI_GRAPHQL_URLS } from '@/lib/constants';
import type { Schema, FieldDefinition } from '@/lib/types';

const SCHEMA_EVENTS_QUERY = `
  query GetSchemaEvents($eventType: String!, $cursor: String) {
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

async function fetchSchemas(): Promise<Schema[]> {
  const gql = new SuiGraphQLClient({
    network: 'testnet',
    url: SUI_GRAPHQL_URLS.testnet,
  });

  try {
    const eventType = `${PACKAGE_ID}::schema::SchemaCreated`;
    const result = await gql.query<EventsQueryResult>({
      query: SCHEMA_EVENTS_QUERY,
      variables: { eventType },
    });

    const events = result.data?.events;
    if (!events) return [];

    const schemas: Schema[] = [];
    const decoder = new TextDecoder();

    for (const node of events.nodes) {
      const parsed = node.contents?.json;
      if (!parsed) continue;

      const name = Array.isArray(parsed.name)
        ? decoder.decode(new Uint8Array(parsed.name as number[]))
        : String(parsed.name ?? '');

      const walrusBlobVec = parsed.walrus_blob_id as { vec?: string[] } | undefined;

      schemas.push({
        id: String(parsed.schema_id ?? ''),
        creator: String(parsed.creator ?? ''),
        name,
        description: '',
        fields: [] as FieldDefinition[],
        walrusBlobId:
          walrusBlobVec?.vec && walrusBlobVec.vec.length > 0
            ? walrusBlobVec.vec[0]
            : null,
        createdAt: Number(parsed.timestamp ?? 0),
      });
    }

    return schemas;
  } catch {
    return [];
  }
}

export default async function SchemasPage() {
  const schemas = await fetchSchemas();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Schemas</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Attestation schema definitions registered on-chain
          </p>
        </div>
        <Link
          href="/schemas/create"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          Create schema
        </Link>
      </div>

      {schemas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 py-16 text-center">
          <p className="text-zinc-500">No schemas found.</p>
          <Link
            href="/schemas/create"
            className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300"
          >
            Create the first schema
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {schemas.map((schema) => (
            <SchemaCard key={schema.id} schema={schema} />
          ))}
        </div>
      )}
    </div>
  );
}
