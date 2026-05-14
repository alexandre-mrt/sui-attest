type Status = 'valid' | 'revoked' | 'expired' | 'unknown';

interface StatusBadgeProps {
  status: Status;
}

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  valid: {
    label: 'Valid',
    className: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30',
  },
  revoked: {
    label: 'Revoked',
    className: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30',
  },
  expired: {
    label: 'Expired',
    className: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30',
  },
  unknown: {
    label: 'Unknown',
    className: 'bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/30',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function deriveStatus(params: {
  revoked: boolean;
  expiresAt: number | null;
}): Status {
  if (params.revoked) return 'revoked';
  if (params.expiresAt !== null && params.expiresAt < Date.now()) return 'expired';
  return 'valid';
}
