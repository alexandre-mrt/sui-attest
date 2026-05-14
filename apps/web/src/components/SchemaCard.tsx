import Link from 'next/link';
import { truncateAddress, formatTimestamp } from '@/lib/utils';
import type { Schema } from '@/lib/types';

interface SchemaCardProps {
  schema: Schema;
}

export function SchemaCard({ schema }: SchemaCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-zinc-100 truncate">{schema.name}</h3>
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{schema.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400 ring-1 ring-blue-500/30">
          {schema.fields.length} field{schema.fields.length !== 1 ? 's' : ''}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
        <div>
          <dt className="text-zinc-500">Creator</dt>
          <dd className="font-mono text-zinc-300">{truncateAddress(schema.creator)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Created</dt>
          <dd className="text-zinc-300">{formatTimestamp(schema.createdAt)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-1.5">
        {schema.fields.map((field) => (
          <span
            key={field.name}
            className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
          >
            {field.name}
            <span className="ml-1 text-zinc-600">:{field.fieldType}</span>
            {field.required && <span className="ml-0.5 text-red-400">*</span>}
          </span>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Link
          href={`/attest?schemaId=${schema.id}`}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Issue attestation
        </Link>
      </div>
    </div>
  );
}
