import Link from 'next/link';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { SchemaCard } from '@/components/SchemaCard';
import { SUI_RPC_URLS, PACKAGE_ID } from '@/lib/constants';
import type { Schema, FieldDefinition } from '@/lib/types';

async function fetchSchemas(): Promise<Schema[]> {
  const client = new SuiJsonRpcClient({ network: 'testnet', url: SUI_RPC_URLS.testnet });

  try {
    const events = await client.queryEvents({
      query: { MoveEventType: `${PACKAGE_ID}::schema::SchemaCreated` },
      limit: 50,
      order: 'descending',
    });

    const schemas: Schema[] = [];

    for (const event of events.data) {
      const parsed = event.parsedJson as {
        schema_id: string;
        creator: string;
        name: number[];
        walrus_blob_id: { vec: string[] };
        timestamp: string;
      } | null;

      if (!parsed) continue;

      const decoder = new TextDecoder();

      // Fetch the full schema object to get field definitions
      try {
        const obj = await client.getObject({
          id: parsed.schema_id,
          options: { showContent: true },
        });

        let fields: FieldDefinition[] = [];

        if (obj.data?.content?.dataType === 'moveObject') {
          // Fields are stored in the SchemaRegistry table, not directly accessible
          // as a top-level object. We rely on event data for the basic schema.
          fields = [];
        }

        schemas.push({
          id: parsed.schema_id,
          creator: parsed.creator,
          name: decoder.decode(new Uint8Array(parsed.name)),
          description: '',
          fields,
          walrusBlobId:
            parsed.walrus_blob_id?.vec?.length > 0
              ? parsed.walrus_blob_id.vec[0]
              : null,
          createdAt: Number(parsed.timestamp),
        });
      } catch {
        // If object fetch fails, still show from event data
        schemas.push({
          id: parsed.schema_id,
          creator: parsed.creator,
          name: decoder.decode(new Uint8Array(parsed.name)),
          description: '',
          fields: [],
          walrusBlobId:
            parsed.walrus_blob_id?.vec?.length > 0
              ? parsed.walrus_blob_id.vec[0]
              : null,
          createdAt: Number(parsed.timestamp),
        });
      }
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
