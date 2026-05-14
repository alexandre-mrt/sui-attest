import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
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
  const client = new SuiJsonRpcClient({ network: 'testnet', url: SUI_RPC_URLS.testnet });

  try {
    const obj = await client.getObject({
      id,
      options: { showContent: true },
    });

    if (!obj.data?.content || obj.data.content.dataType !== 'moveObject') {
      return { attestation: null, revoked: false };
    }

    const fields = obj.data.content.fields as Record<string, unknown>;

    const attestation: Attestation = {
      id,
      schemaId: (fields.schema_id as { id: string }).id ?? (fields.schema_id as string),
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
      const revokedField = await client.getDynamicFieldObject({
        parentId: REVOCATION_REGISTRY_ID,
        name: { type: '0x2::object::ID', value: id },
      });
      revoked = revokedField.data !== null && !revokedField.error;
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <p className="text-red-400 font-medium">Attestation not found</p>
          <p className="text-sm text-zinc-500 mt-2">
            ID: <code className="font-mono">{id}</code>
          </p>
          <Link
            href="/explorer"
            className="mt-4 inline-block text-sm text-blue-400 hover:text-blue-300"
          >
            Back to explorer
          </Link>
        </div>
      </div>
    );
  }

  const status = deriveStatus({ revoked, expiresAt: attestation.expiresAt });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Attestation</h1>
          <p className="text-sm font-mono text-zinc-500 mt-1">
            {truncateAddress(attestation.id, 12)}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800">
        <dl className="grid grid-cols-1 gap-0 divide-y divide-zinc-800">
          <Row label="Schema ID" value={attestation.schemaId} mono />
          <Row label="Attester" value={attestation.attester} mono />
          <Row label="Recipient" value={attestation.recipient} mono />
          <Row label="Data Hash" value={`0x${attestation.dataHash}`} mono />
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

      {/* F004: Walrus credential document viewer — shown for non-encrypted attestations */}
      {!attestation.isEncrypted && attestation.walrusBlobId && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-medium text-zinc-300">
            Credential Document
          </h2>
          <WalrusDocViewer blobId={attestation.walrusBlobId} />
        </div>
      )}

      {/* Decrypt section — only shown for encrypted attestations with a Walrus blob */}
      {attestation.isEncrypted && attestation.walrusBlobId && (
        <div className="mt-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
          <h2 className="text-sm font-semibold text-yellow-300 mb-3 flex items-center gap-2">
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
          <p className="text-xs text-zinc-400 mb-4">
            This attestation data is encrypted using SEAL threshold encryption.
            Only authorized verifiers can decrypt it.
          </p>
          <DecryptButton walrusBlobId={attestation.walrusBlobId} />
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <a
          href={`https://suiscan.xyz/testnet/object/${attestation.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          View on Suiscan &rarr;
        </a>
        <Link href="/verify" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
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
    <div className="flex flex-col sm:flex-row sm:items-baseline px-5 py-3.5 gap-1 sm:gap-4">
      <dt className="text-sm text-zinc-500 w-32 shrink-0">{label}</dt>
      <dd
        className={`text-sm text-zinc-200 break-all ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
