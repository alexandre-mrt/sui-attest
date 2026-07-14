// Deployed package (testnet) — see DEPLOYED.md
export const PACKAGE_ID =
  '0xad9694dd2e550d1d0323c020f476f68e634b9b251bde4f72dccc9c1221b0d86f';

export const SCHEMA_REGISTRY_ID =
  '0xee6f0b2a0ef8ce839b3690391718175ab64d3039c55fff6d1fa29e9be8073c4c';
export const REVOCATION_REGISTRY_ID =
  '0x72169c41300e41991ca88ef14ecaff3261ee4a510b9f9bff5702ccd9cbeae2d3';

// SEAL encryption configuration (testnet)
export const SEAL_KEY_SERVERS = [
  {
    objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
    weight: 1,
  },
  {
    objectId: '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
    weight: 1,
  },
] as const;

export const SEAL_THRESHOLD = 2;
export const SESSION_KEY_TTL_MIN = 10;

// Sui Clock object (always 0x6 on Sui)
export const CLOCK_ID = '0x6';

export const NETWORK = 'testnet' as const;

export const SUI_RPC_URLS = {
  mainnet: 'https://fullnode.mainnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
} as const;

export const SUI_GRAPHQL_URLS = {
  mainnet: 'https://graphql.mainnet.sui.io/graphql',
  testnet: 'https://graphql.testnet.sui.io/graphql',
} as const;

export const MAX_FIELDS = 32;
export const MAX_NAME_LENGTH = 128;
export const MAX_DESCRIPTION_LENGTH = 1024;

export const FIELD_TYPES = ['string', 'u64', 'bool', 'address', 'bytes'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

// F004: Walrus storage configuration
export const WALRUS_EPOCHS = 53; // ~2 years on testnet/mainnet
export const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';
