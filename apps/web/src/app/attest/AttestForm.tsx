'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWalletConnection } from '@mysten/dapp-kit-react';
import { WalrusUpload } from '@/components/WalrusUpload';
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
  const [credentialDoc, setCredentialDoc] = useState<Uint8Array | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sid = searchParams.get('schemaId');
    if (sid) setSchemaId(sid);
  }, [searchParams]);

  const handleCredentialFile = useCallback((bytes: Uint8Array) => {
    setCredentialDoc(bytes);
  }, []);

  const handleCredentialClear = useCallback(() => {
    setCredentialDoc(undefined);
  }, []);

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
        credentialDoc: encrypt ? undefined : credentialDoc,
      });
      router.push(`/explorer?tx=${digest}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Schema ID */}
      <div className="py-6">
        <label
          htmlFor="attest-schema"
          className="block text-[13px] font-medium text-text-secondary uppercase tracking-wider mb-2"
        >
          Schema ID <span className="text-revoked">*</span>
        </label>
        <input
          id="attest-schema"
          type="text"
          required
          placeholder="0x..."
          value={schemaId}
          onChange={(e) => setSchemaId(e.target.value)}
          className="w-full bg-bg-input border border-border rounded-lg h-10 px-3 text-[0.875rem] font-mono text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-muted transition-[border-color] duration-150"
        />
        <p className="mt-2 text-[0.8125rem] text-text-tertiary">
          The object ID of the schema to attest against.{' '}
          <a href="/schemas" className="text-accent hover:text-accent-hover transition-colors duration-150">
            Browse schemas
          </a>
        </p>
      </div>

      <hr className="border-border" />

      {/* Recipient */}
      <div className="py-6">
        <label
          htmlFor="attest-recipient"
          className="block text-[13px] font-medium text-text-secondary uppercase tracking-wider mb-2"
        >
          Recipient address <span className="text-revoked">*</span>
        </label>
        <input
          id="attest-recipient"
          type="text"
          required
          placeholder="0x..."
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="w-full bg-bg-input border border-border rounded-lg h-10 px-3 text-[0.875rem] font-mono text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-muted transition-[border-color] duration-150"
        />
      </div>

      <hr className="border-border" />

      {/* Attestation data */}
      <div className="py-6">
        <label
          htmlFor="attest-data"
          className="block text-[13px] font-medium text-text-secondary uppercase tracking-wider mb-2"
        >
          Attestation data (JSON)
        </label>
        <textarea
          id="attest-data"
          rows={6}
          value={dataJson}
          onChange={(e) => setDataJson(e.target.value)}
          className="w-full bg-bg-input border border-border rounded-lg p-3 text-[0.875rem] font-mono text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-muted transition-[border-color] duration-150 resize-none"
          spellCheck={false}
        />
        <p className="mt-2 text-[0.8125rem] text-text-tertiary">
          A SHA-256 hash of this data will be stored on-chain.
        </p>
      </div>

      <hr className="border-border" />

      {/* Expiry date */}
      <div className="py-6">
        <label
          htmlFor="attest-expires"
          className="block text-[13px] font-medium text-text-secondary uppercase tracking-wider mb-2"
        >
          Expiry date <span className="text-text-tertiary text-[11px] normal-case tracking-normal">(optional)</span>
        </label>
        <input
          id="attest-expires"
          type="date"
          value={expiresAt}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="bg-bg-input border border-border rounded-lg h-10 px-3 text-[0.875rem] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-muted transition-[border-color] duration-150"
        />
      </div>

      <hr className="border-border" />

      {/* Credential document upload (shown only when not encrypting) */}
      {!encrypt && (
        <>
          <div className="py-6">
            <WalrusUpload
              label="Credential document"
              accept=".json,.txt,.md,.pdf"
              onFile={handleCredentialFile}
              onClear={handleCredentialClear}
              disabled={isSubmitting}
            />
          </div>
          <hr className="border-border" />
        </>
      )}

      {/* SEAL Encryption Toggle */}
      <div className="py-6">
        <div className="bg-bg-surface border border-border rounded-xl p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <div className="relative mt-0.5">
              <input
                id="attest-encrypt"
                type="checkbox"
                checked={encrypt}
                onChange={(e) => setEncrypt(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 rounded-full bg-bg-hover peer-checked:bg-accent transition-colors duration-150" />
              <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-text-primary transition-transform duration-150 peer-checked:translate-x-4" />
            </div>
            <div>
              <span className="text-[0.875rem] font-medium text-text-primary flex items-center gap-2">
                Encrypt attestation data
                {encrypt && (
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide bg-encrypted/10 text-encrypted border border-encrypted/20">
                    SEAL
                  </span>
                )}
              </span>
              <p className="text-[0.8125rem] text-text-secondary mt-1">
                When enabled, data is encrypted with SEAL so only the recipient can decrypt.
                Requires 2 transactions (create allowlist + attest).
              </p>
            </div>
          </label>
        </div>
      </div>

      {error && (
        <div className="pb-6">
          <p className="rounded-lg border border-revoked/30 bg-revoked/10 px-4 py-3 text-[0.875rem] text-revoked">
            {error}
          </p>
        </div>
      )}

      {!isConnected && (
        <p className="pb-4 text-[0.875rem] text-text-secondary">
          Connect your wallet to submit.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !isConnected}
        className="w-full bg-accent text-text-inverse h-10 rounded-lg text-[0.875rem] font-medium hover:bg-accent-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
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
