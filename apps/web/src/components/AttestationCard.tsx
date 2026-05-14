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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={status} />
            {schemaName && (
              <span className="text-xs text-zinc-500 truncate">{schemaName}</span>
            )}
          </div>
          <Link
            href={`/attestation/${attestation.id}`}
            className="text-sm font-mono text-blue-400 hover:text-blue-300 truncate block"
          >
            {truncateAddress(attestation.id, 8)}
          </Link>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <dt className="text-zinc-500">Attester</dt>
          <dd className="font-mono text-zinc-300 truncate">
            {truncateAddress(attestation.attester)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Recipient</dt>
          <dd className="font-mono text-zinc-300 truncate">
            {truncateAddress(attestation.recipient)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Issued</dt>
          <dd className="text-zinc-300">{formatTimestamp(attestation.createdAt)}</dd>
        </div>
        {attestation.expiresAt !== null && (
          <div>
            <dt className="text-zinc-500">Expires</dt>
            <dd className="text-zinc-300">{formatTimestamp(attestation.expiresAt)}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
