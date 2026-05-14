/**
 * SEAL threshold encryption for SuiAttest.
 *
 * Uses the allowlist pattern: attester creates an AttestationAllowlist shared object,
 * adds verifiers (including the recipient), then encrypts data using the allowlist ID
 * as the SEAL identity. Only listed verifiers can decrypt.
 *
 * Flow:
 * 1. Attester creates allowlist (seal_policy::create_allowlist)
 * 2. Attester adds recipient as verifier (seal_policy::add_verifier)
 * 3. Attester encrypts data using allowlist ID as identity
 * 4. Encrypted bytes uploaded to Walrus, blob ID stored in Attestation
 * 5. Recipient fetches encrypted blob from Walrus, decrypts using session key
 */

import { SealClient, SessionKey, EncryptedObject } from "@mysten/seal";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex, toHex } from "@mysten/sui/utils";
import type { KeyServerConfig, SealCompatibleClient } from "@mysten/seal";
import {
	MODULE_SEAL_POLICY,
	SEAL_KEY_SERVERS_TESTNET,
	SEAL_THRESHOLD_TESTNET,
	SESSION_KEY_TTL_MIN,
} from "./constants.js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SealConfig {
	/** SEAL key server configurations */
	serverConfigs: KeyServerConfig[];
	/** Minimum number of servers required to decrypt (t-of-n) */
	threshold: number;
	/** Package ID containing seal_approve (the upgraded package) */
	packageId: string;
}

export interface EncryptAttestationResult {
	/** BCS-serialized EncryptedObject bytes — store on Walrus */
	encryptedBytes: Uint8Array;
	/**
	 * The SEAL identity used for encryption (allowlist ID + nonce).
	 * Store alongside the encrypted bytes to allow PTB construction later.
	 */
	sealId: string;
	/**
	 * The symmetric backup key — bypasses SEAL access control entirely.
	 * Discard or store in a secure HSM only. Never expose.
	 */
	backupKey: Uint8Array;
}

// ── Identity Helpers ───────────────────────────────────────────────────────

/**
 * Build a SEAL allowlist identity: allowlist object ID (32 bytes) + random nonce (5 bytes).
 * The nonce ensures each encrypted blob has an independent IBE key, preventing
 * correlation between decryption events.
 */
export function buildAllowlistIdentity(allowlistId: string): string {
	const nonce = crypto.getRandomValues(new Uint8Array(5));
	const idBytes = fromHex(
		allowlistId.startsWith("0x") ? allowlistId.slice(2) : allowlistId,
	);
	return toHex(new Uint8Array([...idBytes, ...nonce]));
}

/**
 * Extract the allowlist object ID from a SEAL identity string.
 * Identity = allowlist ID (32 bytes) + optional nonce.
 */
export function parseAllowlistId(sealId: string): string {
	const bytes = fromHex(sealId.startsWith("0x") ? sealId.slice(2) : sealId);
	return `0x${toHex(bytes.slice(0, 32))}`;
}

// ── SealClient Factory ─────────────────────────────────────────────────────

/**
 * Create a SealClient instance with the given configuration.
 * Use SEAL_KEY_SERVERS_TESTNET for testnet development.
 */
export function createSealClient(
	suiClient: SealCompatibleClient,
	config?: Partial<SealConfig>,
	network: string = "testnet",
): SealClient {
	const serverConfigs = config?.serverConfigs ?? SEAL_KEY_SERVERS_TESTNET;

	return new SealClient({
		suiClient,
		serverConfigs,
		verifyKeyServers: network === "mainnet",
	});
}

// ── Encrypt ────────────────────────────────────────────────────────────────

/**
 * Encrypt attestation data using SEAL threshold encryption.
 *
 * @param sealClient - SealClient instance
 * @param data - Plaintext bytes to encrypt (e.g., JSON-encoded credential doc)
 * @param allowlistId - The AttestationAllowlist object ID on-chain
 * @param config - SEAL config (threshold, packageId)
 * @returns Encrypted bytes + sealId for storage, backup key (discard or secure)
 */
export async function encryptAttestation(
	sealClient: SealClient,
	data: Uint8Array,
	allowlistId: string,
	config: Pick<SealConfig, "threshold" | "packageId">,
): Promise<EncryptAttestationResult> {
	const sealId = buildAllowlistIdentity(allowlistId);

	const { encryptedObject, key } = await sealClient.encrypt({
		threshold: config.threshold,
		packageId: config.packageId,
		id: sealId,
		data,
	});

	return {
		encryptedBytes: encryptedObject,
		sealId,
		backupKey: key,
	};
}

// ── Decrypt ────────────────────────────────────────────────────────────────

/**
 * Build the PTB (as bytes) that calls seal_approve on the allowlist.
 * The PTB must contain ONLY seal_approve* calls — no other Move functions.
 */
async function buildSealApprovePtb(
	parsed: ReturnType<typeof EncryptedObject.parse>,
	allowlistId: string,
	suiClient: SealCompatibleClient,
): Promise<Uint8Array> {
	const tx = new Transaction();
	const sealIdBytes = fromHex(
		parsed.id.startsWith("0x") ? parsed.id.slice(2) : parsed.id,
	);

	tx.moveCall({
		target: `${parsed.packageId}::${MODULE_SEAL_POLICY}::seal_approve`,
		arguments: [
			tx.pure.vector("u8", Array.from(sealIdBytes)),
			tx.object(allowlistId),
		],
	});

	return tx.build({ client: suiClient, onlyTransactionKind: true });
}

/**
 * Decrypt attestation data using SEAL threshold decryption.
 *
 * The caller must provide a session key signed by the user's wallet.
 * The user must be listed as a verifier in the AttestationAllowlist.
 *
 * @param sealClient - SealClient instance
 * @param encryptedBytes - BCS-serialized EncryptedObject (fetched from Walrus)
 * @param sealId - The SEAL identity used during encryption (stored alongside the blob)
 * @param sessionKey - Session key signed by the user wallet
 * @param suiClient - Sui client for building the PTB
 * @returns Decrypted plaintext bytes
 */
export async function decryptAttestation(
	sealClient: SealClient,
	encryptedBytes: Uint8Array,
	sessionKey: SessionKey,
	suiClient: SealCompatibleClient,
): Promise<Uint8Array> {
	const parsed = EncryptedObject.parse(encryptedBytes);
	const allowlistId = parseAllowlistId(parsed.id);

	const txBytes = await buildSealApprovePtb(parsed, allowlistId, suiClient);

	const decrypted = await sealClient.decrypt({
		data: encryptedBytes,
		sessionKey,
		txBytes,
	});

	return decrypted;
}

// ── Session Key Helper ─────────────────────────────────────────────────────

/**
 * Create a session key for SEAL decryption.
 * The caller must sign the personal message with their wallet and call
 * sessionKey.setPersonalMessageSignature(signature) before using it.
 *
 * @param address - User's wallet address
 * @param packageId - Package ID (the upgraded package with seal_policy)
 * @param suiClient - Sui client
 * @param ttlMin - Session key TTL in minutes (default: SESSION_KEY_TTL_MIN)
 */
export async function createSessionKey(
	address: string,
	packageId: string,
	suiClient: SealCompatibleClient,
	ttlMin = SESSION_KEY_TTL_MIN,
): Promise<SessionKey> {
	return SessionKey.create({
		address,
		packageId,
		ttlMin,
		suiClient,
	});
}

// ── Transaction Builders ───────────────────────────────────────────────────

/**
 * Build a transaction to create an AttestationAllowlist on-chain.
 * The attester is automatically added as a verifier.
 * Returns the transaction — caller must sign and execute it.
 */
export function buildCreateAllowlistTx(packageId: string): Transaction {
	const tx = new Transaction();
	tx.moveCall({
		target: `${packageId}::${MODULE_SEAL_POLICY}::create_allowlist`,
		arguments: [],
	});
	return tx;
}

/**
 * Build a transaction to add a verifier to an existing AttestationAllowlist.
 * Only the allowlist's attester can call this.
 */
export function buildAddVerifierTx(
	packageId: string,
	allowlistId: string,
	verifier: string,
): Transaction {
	const tx = new Transaction();
	tx.moveCall({
		target: `${packageId}::${MODULE_SEAL_POLICY}::add_verifier`,
		arguments: [tx.object(allowlistId), tx.pure.address(verifier)],
	});
	return tx;
}

// ── Default Config ─────────────────────────────────────────────────────────

/**
 * Default SEAL config for testnet.
 */
export function defaultTestnetSealConfig(packageId: string): SealConfig {
	return {
		serverConfigs: SEAL_KEY_SERVERS_TESTNET,
		threshold: SEAL_THRESHOLD_TESTNET,
		packageId,
	};
}
