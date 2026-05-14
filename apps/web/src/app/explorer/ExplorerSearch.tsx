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
        className="flex-1 bg-bg-input border border-border rounded-lg h-10 px-3 text-[0.875rem] font-mono text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-[2px] focus:ring-accent-muted transition-[border-color] duration-150"
      />
      <button
        type="submit"
        className="bg-accent text-text-inverse rounded-lg h-10 px-4 text-[0.875rem] font-medium hover:bg-accent-hover transition-colors duration-150"
      >
        Search
      </button>
    </form>
  );
}
