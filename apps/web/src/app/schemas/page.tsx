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
    <div className="max-w-[1120px] mx-auto px-6 py-16 animate-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[1.75rem] font-medium text-text-primary leading-[1.3]">
          Schemas
        </h1>
        <Link
          href="/schemas/create"
          className="inline-flex items-center h-10 rounded-lg border border-border px-4 text-sm font-medium text-text-primary hover:bg-bg-hover hover:border-border-hover transition-all duration-150"
        >
          Create schema
        </Link>
      </div>

      <div className="border-t border-border mb-8" />

      {schemas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="font-display italic text-text-secondary text-lg">
            No schemas yet
          </p>
          <Link
            href="/schemas/create"
            className="mt-4 inline-block text-sm text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            Create the first schema
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {schemas.map((schema) => (
            <SchemaCard key={schema.id} schema={schema} />
          ))}
        </div>
      )}
    </div>
  );
}
