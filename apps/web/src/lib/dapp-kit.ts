import { createDAppKit } from '@mysten/dapp-kit-core';
import { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';
import { NETWORK } from './constants';

// createDAppKit v1.3 requires `networks` array and `createClient` factory function.
// `networks` type must match SuiClientTypes.Network[] — use string literals.
export const dAppKit = createDAppKit({
  networks: ['testnet', 'mainnet'] as const,
  defaultNetwork: NETWORK,
  createClient: (network) =>
    new SuiJsonRpcClient({
      network,
      url: network === 'mainnet'
        ? 'https://fullnode.mainnet.sui.io:443'
        : 'https://fullnode.testnet.sui.io:443',
    }),
});
