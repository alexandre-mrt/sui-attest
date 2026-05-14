export const MODULE_SCHEMA = "schema";
export const MODULE_ATTESTATION = "attestation";

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

export const TESTNET_CONFIG = {
	packageId:
		"0x4e1ff3e1a13fcfdc4e061cd17a2db6685e284182749e40a4920c4e1c8286ec18",
	schemaRegistryId:
		"0x1ba7a647bab32dab5cf26f7b5ebdf0c7b9f0fb328a62e224bba45ce0bf493286",
	revocationRegistryId:
		"0x0b4d19c17ebd450f9209a665be589f0a171bbe8e4d2970c84678d9ea840d7624",
};
