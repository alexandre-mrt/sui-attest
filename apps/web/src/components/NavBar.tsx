'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectWallet } from './ConnectWallet';

const NAV_LINKS = [
  { href: '/explorer', label: 'Explorer' },
  { href: '/schemas', label: 'Schemas' },
  { href: '/attest', label: 'Attest' },
  { href: '/verify', label: 'Verify' },
  { href: '/my', label: 'My Attestations' },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-border bg-bg-root/80 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1120px] items-center justify-between px-6 lg:px-8">
        <Link
          href="/"
          className="font-sans text-base font-medium text-text-primary transition-colors hover:text-accent"
        >
          SuiAttest
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm transition-colors ${
                  isActive
                    ? 'border-b-2 border-accent pb-0.5 text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <ConnectWallet />
      </div>
    </nav>
  );
}
