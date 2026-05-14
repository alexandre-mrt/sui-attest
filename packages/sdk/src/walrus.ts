import { WalrusClient, RetryableWalrusClientError } from "@mysten/walrus";
import type { Signer } from "@mysten/sui/cryptography";
import type { ClientWithCoreApi } from "@mysten/sui/client";

import { WALRUS_EPOCHS } from "./constants.js";

const MAX_RETRIES = 3;

/**
 * Create a WalrusClient backed by the given Sui client.
 * Only testnet and mainnet are supported by Walrus.
 */
export function createWalrusClient(
	suiClient: ClientWithCoreApi,
	network: "mainnet" | "testnet",
): WalrusClient {
	return new WalrusClient({ network, suiClient });
}

/**
 * Upload a raw byte payload to Walrus and return the blob ID.
 * Automatically retries on RetryableWalrusClientError (up to MAX_RETRIES).
 * Credentials are stored as non-deletable blobs for permanence.
 */
export async function uploadToWalrus(
	walrusClient: WalrusClient,
	data: Uint8Array,
	signer: Signer,
	epochs: number = WALRUS_EPOCHS,
): Promise<string> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			const { blobId } = await walrusClient.writeBlob({
				blob: data,
				deletable: false,
				epochs,
				signer,
			});
			return blobId;
		} catch (err) {
			if (err instanceof RetryableWalrusClientError) {
				walrusClient.reset();
				lastError = err;
				continue;
			}
			throw err;
		}
	}

	throw lastError ?? new Error("Walrus upload failed after max retries");
}

/**
 * Read a blob from Walrus by its blob ID.
 * Automatically retries on RetryableWalrusClientError (up to MAX_RETRIES).
 */
export async function readFromWalrus(
	walrusClient: WalrusClient,
	blobId: string,
): Promise<Uint8Array> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		try {
			return await walrusClient.readBlob({ blobId });
		} catch (err) {
			if (err instanceof RetryableWalrusClientError) {
				walrusClient.reset();
				lastError = err;
				continue;
			}
			throw err;
		}
	}

	throw lastError ?? new Error("Walrus read failed after max retries");
}
