import Link from 'next/link';
import { truncateAddress, formatTimestamp } from '@/lib/utils';
import type { Schema } from '@/lib/types';

interface SchemaCardProps {
  schema: Schema;
}

export function SchemaCard({ schema }: SchemaCardProps) {
  return (
    <div className="rounded-xl border border-border bg-bg-surface p-5 hover:border-border-hover hover:bg-bg-hover transition-all duration-200">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium text-text-primary truncate">{schema.name}</h3>
          <p className="text-[13px] text-text-secondary mt-0.5 line-clamp-2">{schema.description}</p>
        </div>
        <span className="shrink-0 rounded-md bg-accent-muted px-2 py-0.5 text-[11px] font-medium text-accent border border-accent-border uppercase tracking-wide">
          {schema.fields.length} field{schema.fields.length !== 1 ? 's' : ''}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] mb-3">
        <div>
          <dt className="text-text-secondary">Creator</dt>
          <dd className="font-mono text-text-primary tracking-[-0.02em]">{truncateAddress(schema.creator)}</dd>
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
          className="text-[13px] text-text-secondary hover:text-text-primary transition-colors duration-150"
        >
          Issue attestation
        </Link>
      </div>
    </div>
  );
}
