'use client';

/**
 * DecryptButton — Client-side SEAL decryption for encrypted attestations.
 *
 * Shown only when `isEncrypted=true` AND `walrusBlobId` is present.
 * The user must be listed in the AttestationAllowlist to decrypt.
 * Prompts the user to sign a personal message for the SEAL session key.
 */

import { useState } from 'react';
import { useSeal } from '@/hooks/useSeal';
import { useWalletConnection } from '@mysten/dapp-kit-react';

interface DecryptButtonProps {
  /** Walrus blob ID containing the encrypted bytes */
  walrusBlobId: string;
}

export function DecryptButton({ walrusBlobId }: DecryptButtonProps) {
  const { isConnected } = useWalletConnection();
  const { decrypt } = useSeal();
  const [status, setStatus] = useState<'idle' | 'decrypting' | 'done' | 'error'>('idle');
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDecrypt = async () => {
    if (!isConnected) {
      setErrorMsg('Connect your wallet first');
      return;
    }

    setStatus('decrypting');
    setErrorMsg(null);

    try {
      // Fetch encrypted bytes from Walrus aggregator
      // Walrus read URL is hardcoded for testnet aggregator.
      const aggregatorUrl = `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${walrusBlobId}`;
      const response = await fetch(aggregatorUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch from Walrus: ${response.statusText}`);
      }

      const encryptedBytes = new Uint8Array(await response.arrayBuffer());
      const decryptedBytes = await decrypt(encryptedBytes);

      const text = new TextDecoder().decode(decryptedBytes);
      setPlaintext(text);
      setStatus('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Decryption failed');
      setStatus('error');
    }
  };

  if (status === 'done' && plaintext !== null) {
    let formatted: string;
    try {
      formatted = JSON.stringify(JSON.parse(plaintext), null, 2);
    } catch {
      formatted = plaintext;
    }

    return (
      <div className="rounded-xl border border-valid/20 bg-valid/10 p-5">
        <p className="mb-2 text-[13px] font-medium uppercase tracking-wider text-valid">Decrypted data</p>
        <pre className="whitespace-pre-wrap break-all font-mono text-sm text-text-primary">
          {formatted}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleDecrypt}
        disabled={status === 'decrypting' || !isConnected}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-transparent px-4 text-sm font-medium text-text-primary transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z"
            clipRule="evenodd"
          />
        </svg>
        {status === 'decrypting' ? 'Decrypting...' : 'Decrypt with SEAL'}
      </button>

      {!isConnected && (
        <p className="text-[13px] text-text-secondary">Connect your wallet to decrypt.</p>
      )}

      {status === 'error' && errorMsg && (
        <p className="rounded-lg border border-revoked/20 bg-revoked/10 px-3 py-2 text-[13px] text-revoked">
          {errorMsg}
        </p>
      )}

      <p className="text-[13px] text-text-secondary">
        You must be listed as a verifier in the attestation allowlist.
        Signing a personal message creates a temporary session key.
      </p>
    </div>
  );
}
