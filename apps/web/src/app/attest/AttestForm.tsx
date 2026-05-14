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
        {isSubmitting ? 'Submitting transaction...' : 'Issue attestation'}
      </button>
    </form>
  );
}
