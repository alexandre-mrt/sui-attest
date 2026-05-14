// V3 package — schema + attestation + seal_policy + revoke_by_id
export const PACKAGE_ID =
  '0x3827645d508fd7f1ebbddb0f7d7804e8b0b6658b7c8e729e4be90a69cefb21a1';

export const SCHEMA_REGISTRY_ID =
  '0x023e5da71a29d6cc94919453d7c3b3a269c1afb6fa2b0b8e8f51ac0a1bf4150f';
export const REVOCATION_REGISTRY_ID =
  '0x3b5f1504c8320c726a35ceb59974ca69ed675b51cb5dd9aac1c16703490c8ab7';

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
