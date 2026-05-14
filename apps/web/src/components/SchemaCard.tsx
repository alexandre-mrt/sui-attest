import Link from 'next/link';
import { truncateAddress, formatTimestamp } from '@/lib/utils';
import type { Schema } from '@/lib/types';

interface SchemaCardProps {
  schema: Schema;
}

export function SchemaCard({ schema }: SchemaCardProps) {
  return (
    <div className="rounded-xl border border-border bg-bg-surface p-5 transition-[border-color] duration-200 hover:border-border-hover">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-medium text-text-primary">{schema.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-[13px] text-text-secondary">{schema.description}</p>
        </div>
        <span className="shrink-0 rounded-md border border-info/20 bg-info/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-info">
          {schema.fields.length} field{schema.fields.length !== 1 ? 's' : ''}
        </span>
      </div>

      <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
        <div>
          <dt className="text-text-secondary">Creator</dt>
          <dd className="font-mono text-text-primary">{truncateAddress(schema.creator)}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Created</dt>
          <dd className="text-text-primary">{formatTimestamp(schema.createdAt)}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-1.5">
        {schema.fields.map((field) => (
          <span
            key={field.name}
            className="rounded-md bg-bg-hover px-2 py-0.5 text-[13px] text-text-secondary"
          >
            {field.name}
            <span className="ml-1 text-text-tertiary">:{field.fieldType}</span>
            {field.required && <span className="ml-0.5 text-revoked">*</span>}
          </span>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Link
          href={`/attest?schemaId=${schema.id}`}
          className="text-[13px] text-accent transition-colors hover:text-accent-hover"
        >
          Issue attestation
        </Link>
      </div>
    </div>
  );
}
