export const MODULE_SCHEMA = "schema";
export const MODULE_ATTESTATION = "attestation";
export const MODULE_SEAL_POLICY = "seal_policy";

export const CLOCK_OBJECT_ID =
	"0x0000000000000000000000000000000000000000000000000000000000000006";

export const GRPC_URLS: Record<string, string> = {
	mainnet: "https://fullnode.mainnet.sui.io:443",
	testnet: "https://fullnode.testnet.sui.io:443",
	devnet: "https://fullnode.devnet.sui.io:443",
};

export const GRAPHQL_ENDPOINTS: Record<string, string> = {
	mainnet: "https://graphql.mainnet.sui.io/graphql",
	testnet: "https://graphql.testnet.sui.io/graphql",
	devnet: "https://graphql.devnet.sui.io/graphql",
};

export const WALRUS_EPOCHS = 53;
export const MAX_FIELDS = 32;
export const MAX_NAME_LENGTH = 128;
export const MAX_DATA_HASH_LENGTH = 32;

// SEAL key servers for testnet (from @mysten/seal docs)
export const SEAL_KEY_SERVERS_TESTNET: Array<{ objectId: string; weight: number }> = [
	{
		objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
		weight: 1,
	},
	{
		objectId: "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
		weight: 1,
	},
];

export const SEAL_THRESHOLD_TESTNET = 2;
export const SESSION_KEY_TTL_MIN = 10;

export const TESTNET_CONFIG = {
	packageId:
		"0x3827645d508fd7f1ebbddb0f7d7804e8b0b6658b7c8e729e4be90a69cefb21a1",
	schemaRegistryId:
		"0x023e5da71a29d6cc94919453d7c3b3a269c1afb6fa2b0b8e8f51ac0a1bf4150f",
	revocationRegistryId:
		"0x3b5f1504c8320c726a35ceb59974ca69ed675b51cb5dd9aac1c16703490c8ab7",
};
