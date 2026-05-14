'use client';

import dynamic from 'next/dynamic';

// Dynamic import with ssr: false prevents hydration mismatches
// caused by wallet/dapp-kit state that only exists on the client.
// Must be in a Client Component — Server Components cannot use ssr: false.
const DAppKitProviders = dynamic(
  () => import('./providers').then((m) => m.Providers),
  { ssr: false },
);

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return <DAppKitProviders>{children}</DAppKitProviders>;
}
