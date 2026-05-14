'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ExplorerSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    // If it looks like an object ID (0x prefix + 64 hex chars)
    if (/^0x[0-9a-fA-F]{64}$/.test(q)) {
      router.push(`/attestation/${q}`);
    } else {
      // Try as address — show my attestations for that address
      router.push(`/my?address=${q}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex gap-3">
      <input
        type="text"
        placeholder="Search by attestation ID (0x...) or address"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-mono text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
      />
      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
      >
        Search
      </button>
    </form>
  );
}
