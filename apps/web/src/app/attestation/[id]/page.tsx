import { SuiGrpcClient } from '@mysten/sui/grpc';
import { StatusBadge, deriveStatus } from '@/components/StatusBadge';
import { DecryptButton } from '@/components/DecryptButton';
import { WalrusDocViewer } from '@/components/WalrusDocViewer';
import { SUI_RPC_URLS, PACKAGE_ID, REVOCATION_REGISTRY_ID } from '@/lib/constants';
import { truncateAddress, formatTimestamp } from '@/lib/utils';
import type { Attestation } from '@/lib/types';
import Link from 'next/link';

async function fetchAttestation(id: string): Promise<{
  attestation: Attestation | null;
  revoked: boolean;
}> {
  const client = new SuiGrpcClient({ network: 'testnet', baseUrl: SUI_RPC_URLS.testnet });

  try {
    const { object: obj } = await client.getObject({
      objectId: id,
      include: { json: true },
    });

    const json = obj.json;
    if (!json) {
      return { attestation: null, revoked: false };
    }

    const fields = (json.fields as Record<string, unknown>) ?? json;

    const attestation: Attestation = {
      id,
      schemaId: (fields.schema_id as { id: string })?.id ?? (fields.schema_id as string),
      attester: fields.attester as string,
      recipient: fields.recipient as string,
      dataHash: Array.isArray(fields.data_hash)
        ? (fields.data_hash as number[])
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
        : (fields.data_hash as string),
      walrusBlobId: null,
      createdAt: Number(fields.created_at),
      expiresAt: (fields.expires_at as { vec: string[] })?.vec?.length > 0
        ? Number((fields.expires_at as { vec: string[] }).vec[0])
        : null,
      isEncrypted: fields.is_encrypted as boolean,
    };

    // Check revocation by dynamic field on RevocationRegistry
    let revoked = false;
    try {
      const idHex = id.startsWith('0x') ? id.slice(2) : id;
      const padded = idHex.padStart(64, '0');
      const bcsBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        bcsBytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
      }
      await client.getDynamicField({
        parentId: REVOCATION_REGISTRY_ID,
        name: { type: '0x2::object::ID', bcs: bcsBytes },
      });
      revoked = true;
    } catch {
      revoked = false;
    }

    return { attestation, revoked };
  } catch {
    return { attestation: null, revoked: false };
  }
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AttestationDetailPage({ params }: Props) {
  const { id } = await params;
  const { attestation, revoked } = await fetchAttestation(id);

  if (!attestation) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-16">
        <div className="bg-bg-surface border border-border rounded-xl p-8 text-center">
          <p className="font-display italic text-[1.25rem] text-text-secondary mb-3">
            Attestation not found
          </p>
          <p className="text-[0.8125rem] text-text-tertiary">
            ID: <code className="font-mono">{id}</code>
          </p>
          <Link
            href="/explorer"
            className="mt-6 inline-block text-[0.875rem] text-text-secondary hover:text-text-primary transition-colors duration-150"
          >
            Back to explorer
          </Link>
        </div>
      </div>
    );
  }

  const status = deriveStatus({ revoked, expiresAt: attestation.expiresAt });

  return (
    <div className="max-w-[800px] mx-auto px-6 py-16 stagger">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.75rem] font-medium text-text-primary leading-[1.3]">
            Attestation
          </h1>
          <p className="text-[0.875rem] font-mono text-text-secondary mt-2 tracking-[-0.02em]">
            {truncateAddress(attestation.id, 12)}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Main card */}
      <div className="bg-bg-surface border border-border rounded-xl p-6">
        <dl className="divide-y divide-border">
          <Row label="Schema ID" value={attestation.schemaId} mono />
          <Row label="Attester" value={attestation.attester} mono />
          <Row label="Recipient" value={attestation.recipient} mono />
          <Row label="Data Hash" value={`0x${attestation.dataHash}`} mono />

          <hr className="border-border" />

          <Row label="Issued" value={formatTimestamp(attestation.createdAt)} />
          {attestation.expiresAt !== null && (
            <Row label="Expires" value={formatTimestamp(attestation.expiresAt)} />
          )}
          <Row
            label="Encrypted"
            value={attestation.isEncrypted ? 'Yes (SEAL)' : 'No'}
          />
          {attestation.walrusBlobId && (
            <Row label="Walrus Blob ID" value={attestation.walrusBlobId} mono />
          )}
        </dl>
      </div>

      {/* F004: Walrus credential document viewer -- shown for non-encrypted attestations */}
      {!attestation.isEncrypted && attestation.walrusBlobId && (
        <div className="mt-8">
          <h2 className="mb-3 text-[13px] font-medium text-text-secondary uppercase tracking-wider">
            Credential Document
          </h2>
          <WalrusDocViewer blobId={attestation.walrusBlobId} />
        </div>
      )}

      {/* Decrypt section -- only shown for encrypted attestations with a Walrus blob */}
      {attestation.isEncrypted && attestation.walrusBlobId && (
        <div className="mt-8 bg-bg-surface border border-encrypted/20 rounded-xl p-6">
          <h2 className="text-[13px] font-medium text-encrypted uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z"
                clipRule="evenodd"
              />
            </svg>
            SEAL Encrypted Data
          </h2>
          <p className="text-[0.8125rem] text-text-secondary mb-5">
            This attestation data is encrypted using SEAL threshold encryption.
            Only authorized verifiers can decrypt it.
          </p>
          <DecryptButton walrusBlobId={attestation.walrusBlobId} />
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-8 flex gap-3">
        <a
          href={`https://suiscan.xyz/testnet/object/${attestation.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center h-10 px-4 rounded-lg border border-border text-[0.875rem] text-text-primary hover:bg-bg-hover hover:border-border-hover transition-all duration-150"
        >
          View on Suiscan
        </a>
        <Link
          href="/verify"
          className="inline-flex items-center h-10 px-4 rounded-lg border border-border text-[0.875rem] text-text-primary hover:bg-bg-hover hover:border-border-hover transition-all duration-150"
        >
          Verify this attestation
        </Link>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline py-3.5 gap-1 sm:gap-4">
      <dt className="text-[13px] text-text-secondary uppercase tracking-wider w-36 shrink-0">
        {label}
      </dt>
      <dd
        className={`text-[0.875rem] text-text-primary break-all ${mono ? 'font-mono tracking-[-0.02em]' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
