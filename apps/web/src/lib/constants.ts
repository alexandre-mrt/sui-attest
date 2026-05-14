// V1 package — schema + attestation modules (original deployment)
export const LEGACY_PACKAGE_ID =
  '0x4e1ff3e1a13fcfdc4e061cd17a2db6685e284182749e40a4920c4e1c8286ec18';

// V2 package — adds seal_policy module for encrypted attestations
export const PACKAGE_ID =
  '0xbe78d39e0d8bad38be37512b1d067b276b05113b3d236bef3faf04f272884f54';

export const SCHEMA_REGISTRY_ID =
  '0x1ba7a647bab32dab5cf26f7b5ebdf0c7b9f0fb328a62e224bba45ce0bf493286';
export const REVOCATION_REGISTRY_ID =
  '0x0b4d19c17ebd450f9209a665be589f0a171bbe8e4d2970c84678d9ea840d7624';

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
