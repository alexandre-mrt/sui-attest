import { createDAppKit } from '@mysten/dapp-kit-core';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { NETWORK, SUI_RPC_URLS } from './constants';

// createDAppKit v1.3 requires `networks` array and `createClient` factory function.
// `networks` type must match SuiClientTypes.Network[] — use string literals.
// SuiGrpcClient uses gRPC-Web transport (faster binary protocol, lower latency).
export const dAppKit = createDAppKit({
  networks: ['testnet', 'mainnet'] as const,
  defaultNetwork: NETWORK,
  createClient: (network) =>
    new SuiGrpcClient({
      network,
      baseUrl: SUI_RPC_URLS[network as keyof typeof SUI_RPC_URLS],
    }),
});
