'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWalletConnection } from '@mysten/dapp-kit-react';
import { useSuiAttest } from '@/hooks/useSuiAttest';

export function AttestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected } = useWalletConnection();
  const { issueAttestation } = useSuiAttest();

  const [schemaId, setSchemaId] = useState(searchParams.get('schemaId') ?? '');
  const [recipient, setRecipient] = useState('');
  const [dataJson, setDataJson] = useState('{\n  \n}');
  const [expiresAt, setExpiresAt] = useState('');
  const [encrypt, setEncrypt] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sid = searchParams.get('schemaId');
    if (sid) setSchemaId(sid);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Connect your wallet first');
      return;
    }

    let parsedData: Record<string, string>;
    try {
      parsedData = JSON.parse(dataJson) as Record<string, string>;
    } catch {
      setError('Invalid JSON in attestation data');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const digest = await issueAttestation({
        schemaId,
        recipient,
        data: parsedData,
        expiresAt,
        encrypt,
      });
      router.push(`/explorer?tx=${digest}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="attest-schema"
          className="block text-sm font-medium text-zinc-300 mb-1.5"
        >
          Schema ID <span className="text-red-400">*</span>
        </label>
        <input
          id="attest-schema"
          type="text"
          required
          placeholder="0x..."
          value={schemaId}
          onChange={(e) => setSchemaId(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        />
        <p className="mt-1 text-xs text-zinc-500">
          The object ID of the schema to attest against.{' '}
          <a href="/schemas" className="text-blue-400 hover:text-blue-300">
            Browse schemas
          </a>
        </p>
      </div>

      <div>
        <label
          htmlFor="attest-recipient"
          className="block text-sm font-medium text-zinc-300 mb-1.5"
        >
          Recipient address <span className="text-red-400">*</span>
        </label>
        <input
          id="attest-recipient"
          type="text"
          required
          placeholder="0x..."
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        />
      </div>

      <div>
        <label
          htmlFor="attest-data"
          className="block text-sm font-medium text-zinc-300 mb-1.5"
        >
          Attestation data (JSON)
        </label>
        <textarea
          id="attest-data"
          rows={6}
          value={dataJson}
          onChange={(e) => setDataJson(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
          spellCheck={false}
        />
        <p className="mt-1 text-xs text-zinc-500">
          A SHA-256 hash of this data will be stored on-chain.
        </p>
      </div>

      <div>
        <label
          htmlFor="attest-expires"
          className="block text-sm font-medium text-zinc-300 mb-1.5"
        >
          Expiry date (optional)
        </label>
        <input
          id="attest-expires"
          type="date"
          value={expiresAt}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        />
      </div>

      {/* SEAL Encryption Toggle */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <div className="relative mt-0.5">
            <input
              id="attest-encrypt"
              type="checkbox"
              checked={encrypt}
              onChange={(e) => setEncrypt(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 rounded-full bg-zinc-700 peer-checked:bg-blue-600 transition-colors" />
            <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
          </div>
          <div>
            <span className="text-sm font-medium text-zinc-100 flex items-center gap-2">
              Encrypt attestation data
              {encrypt && (
                <span className="text-xs text-yellow-400 font-normal">
                  SEAL threshold encryption
                </span>
              )}
            </span>
            <p className="text-xs text-zinc-500 mt-0.5">
              When enabled, data is encrypted with SEAL so only the recipient can decrypt.
              Requires 2 transactions (create allowlist + attest).
            </p>
          </div>
        </label>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {!isConnected && (
        <p className="text-sm text-zinc-500">
          Connect your wallet to submit.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !isConnected}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting
          ? encrypt
            ? 'Encrypting and submitting...'
            : 'Submitting transaction...'
          : 'Issue attestation'}
      </button>
    </form>
  );
}
