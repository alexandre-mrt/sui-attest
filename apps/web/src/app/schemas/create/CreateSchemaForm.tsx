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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="schema-name"
          className="block text-sm font-medium text-zinc-300 mb-1.5"
        >
          Name <span className="text-red-400">*</span>
        </label>
        <input
          id="schema-name"
          type="text"
          required
          maxLength={128}
          placeholder="e.g. KYC Verified"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        />
      </div>

      <div>
        <label
          htmlFor="schema-description"
          className="block text-sm font-medium text-zinc-300 mb-1.5"
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
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1.5">
          Fields <span className="text-red-400">*</span>
        </label>
        <FieldBuilder fields={fields} onChange={setFields} />
      </div>

      <WalrusUpload
        label="Schema document"
        accept=".json,.txt,.md,.pdf"
        onFile={handleDocFile}
        onClear={handleDocClear}
        disabled={isSubmitting}
      />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {!isConnected && (
        <p className="text-sm text-zinc-500">
          Connect your wallet using the button in the navigation bar to submit.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !isConnected}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Submitting...' : 'Create schema'}
      </button>
    </form>
  );
}
