'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletConnection } from '@mysten/dapp-kit-react';
import { FieldBuilder } from '@/components/FieldBuilder';
import { WalrusUpload } from '@/components/WalrusUpload';
import { useSuiAttest } from '@/hooks/useSuiAttest';
import type { FieldDefinition } from '@/lib/types';

export function CreateSchemaForm() {
  const router = useRouter();
  const { isConnected } = useWalletConnection();
  const { createSchema } = useSuiAttest();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [schemaDoc, setSchemaDoc] = useState<Uint8Array | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDocFile = useCallback((bytes: Uint8Array) => {
    setSchemaDoc(bytes);
  }, []);

  const handleDocClear = useCallback(() => {
    setSchemaDoc(undefined);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Connect your wallet first');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const digest = await createSchema({ name, description, fields, schemaDoc });
      router.push(`/schemas?tx=${digest}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Identity section */}
      <section>
        <label
          htmlFor="schema-name"
          className="block text-[13px] font-medium text-text-secondary uppercase tracking-wider mb-1"
        >
          Name <span className="text-revoked">*</span>
        </label>
        <input
          id="schema-name"
          type="text"
          required
          maxLength={128}
          placeholder="e.g. KYC Verified"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-bg-input border border-border rounded-lg h-10 px-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-[2px] focus:ring-accent-muted transition-[border-color] duration-150"
        />
      </section>

      <div className="border-t border-border my-8" />

      <section>
        <label
          htmlFor="schema-description"
          className="block text-[13px] font-medium text-text-secondary uppercase tracking-wider mb-1"
        >
          Description
        </label>
        <textarea
          id="schema-description"
          rows={3}
          maxLength={1024}
          placeholder="Describe the purpose of this attestation schema"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-bg-input border border-border rounded-lg px-3 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-[2px] focus:ring-accent-muted transition-[border-color] duration-150 resize-none"
        />
      </section>

      <div className="border-t border-border my-8" />

      <section>
        <label className="block text-[13px] font-medium text-text-secondary uppercase tracking-wider mb-1">
          Fields <span className="text-revoked">*</span>
        </label>
        <FieldBuilder fields={fields} onChange={setFields} />
      </section>

      <div className="border-t border-border my-8" />

      <section>
        <WalrusUpload
          label="Schema document"
          accept=".json,.txt,.md,.pdf"
          onFile={handleDocFile}
          onClear={handleDocClear}
          disabled={isSubmitting}
        />
      </section>

      <div className="border-t border-border my-8" />

      {error && (
        <p className="rounded-lg border border-revoked/30 bg-revoked/10 px-4 py-3 text-sm text-revoked mb-6">
          {error}
        </p>
      )}

      {!isConnected && (
        <p className="text-sm text-text-secondary mb-6">
          Connect your wallet using the button in the navigation bar to submit.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !isConnected}
        className="bg-accent text-text-inverse h-10 rounded-lg w-full text-sm font-medium hover:bg-accent-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Submitting...' : 'Create schema'}
      </button>
    </form>
  );
}
