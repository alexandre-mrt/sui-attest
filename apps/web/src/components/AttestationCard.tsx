import Link from 'next/link';
import { StatusBadge, deriveStatus } from './StatusBadge';
import { truncateAddress, formatTimestamp } from '@/lib/utils';
import type { Attestation } from '@/lib/types';

interface AttestationCardProps {
  attestation: Attestation;
  revoked?: boolean;
  schemaName?: string;
}

export function AttestationCard({ attestation, revoked = false, schemaName }: AttestationCardProps) {
  const status = deriveStatus({ revoked, expiresAt: attestation.expiresAt });

  return (
    <div className="rounded-xl border border-border bg-bg-surface p-5 transition-[border-color] duration-200 hover:border-border-hover">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <StatusBadge status={status} />
            {attestation.isEncrypted && (
              <span
                title="SEAL-encrypted — only the recipient can decrypt"
                className="inline-flex items-center gap-1 rounded-md border border-encrypted/20 bg-encrypted/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-encrypted"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-3 w-3"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z"
                    clipRule="evenodd"
                  />
                </svg>
                Encrypted
              </span>
            )}
            {schemaName && (
              <span className="truncate text-[13px] text-text-secondary">{schemaName}</span>
            )}
          </div>
          <Link
            href={`/attestation/${attestation.id}`}
            className="block truncate font-mono text-sm text-accent transition-colors hover:text-accent-hover"
          >
            {truncateAddress(attestation.id, 8)}
          </Link>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
        <div>
          <dt className="text-text-secondary">Attester</dt>
          <dd className="truncate font-mono text-text-primary">
            {truncateAddress(attestation.attester)}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">Recipient</dt>
          <dd className="truncate font-mono text-text-primary">
            {truncateAddress(attestation.recipient)}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">Issued</dt>
          <dd className="text-text-primary">{formatTimestamp(attestation.createdAt)}</dd>
        </div>
        {attestation.expiresAt !== null && (
          <div>
            <dt className="text-text-secondary">Expires</dt>
            <dd className="text-text-primary">{formatTimestamp(attestation.expiresAt)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
