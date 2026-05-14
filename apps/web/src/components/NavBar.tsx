'use client';

import Link from 'next/link';
import { ConnectWallet } from './ConnectWallet';

const NAV_LINKS = [
  { href: '/explorer', label: 'Explorer' },
  { href: '/schemas', label: 'Schemas' },
  { href: '/attest', label: 'Attest' },
  { href: '/verify', label: 'Verify' },
  { href: '/my', label: 'My Attestations' },
] as const;

export function NavBar() {
  return (
    <nav className="border-b border-zinc-800 bg-[#0a0a0a]/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white hover:text-blue-400 transition-colors">
          SuiAttest
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        <ConnectWallet />
      </div>
    </nav>
  );
}
