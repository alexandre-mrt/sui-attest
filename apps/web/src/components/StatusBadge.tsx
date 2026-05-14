type Status = 'valid' | 'revoked' | 'expired' | 'unknown';

interface StatusBadgeProps {
  status: Status;
}

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  valid: {
    label: 'Valid',
    className: 'text-valid bg-valid/10 border border-valid/20',
  },
  revoked: {
    label: 'Revoked',
    className: 'text-revoked bg-revoked/10 border border-revoked/20',
  },
  expired: {
    label: 'Expired',
    className: 'text-expired bg-expired/10 border border-expired/20',
  },
  unknown: {
    label: 'Unknown',
    className: 'text-text-tertiary bg-bg-hover border border-border',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${config.className}`}
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
