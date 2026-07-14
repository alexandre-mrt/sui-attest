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
		"0xad9694dd2e550d1d0323c020f476f68e634b9b251bde4f72dccc9c1221b0d86f",
	schemaRegistryId:
		"0xee6f0b2a0ef8ce839b3690391718175ab64d3039c55fff6d1fa29e9be8073c4c",
	revocationRegistryId:
		"0x72169c41300e41991ca88ef14ecaff3261ee4a510b9f9bff5702ccd9cbeae2d3",
};
