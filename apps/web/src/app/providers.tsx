'use client';

import { DAppKitProvider } from '@mysten/dapp-kit-react';
import { dAppKit } from '@/lib/dapp-kit';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>;
}
