'use client';

import dynamic from 'next/dynamic';

// ConnectButton uses web components (Lit) and must be client-only
const ConnectButtonInner = dynamic(
  () =>
    import('@mysten/dapp-kit-react/ui').then((mod) => ({
      default: mod.ConnectButton,
    })),
  { ssr: false, loading: () => <button className="h-10 w-32 animate-pulse rounded-lg bg-bg-hover" /> },
);

export function ConnectWallet() {
  return <ConnectButtonInner />;
}
