"use client";

import { useState, useCallback } from "react";
import { WalrusClient, RetryableWalrusClientError, WalrusFile } from "@mysten/walrus";
import type { Signer } from "@mysten/sui/cryptography";

import { WALRUS_EPOCHS } from "@/lib/constants";

export type WalrusUploadStatus =
	| "idle"
	| "uploading"
	| "certified"
	| "error";

export interface WalrusUploadState {
	status: WalrusUploadStatus;
	blobId: string | null;
	error: string | null;
}

const MAX_RETRIES = 3;

/**
 * Hook for uploading files to Walrus storage in the browser.
 * Uses the writeFilesFlow pattern for wallet-signed transactions.
 */
export function useWalrusUpload(walrusClient: WalrusClient | null) {
	const [state, setState] = useState<WalrusUploadState>({
		status: "idle",
		blobId: null,
		error: null,
	});

	const upload = useCallback(
		async (
			data: Uint8Array,
			identifier: string,
			signer: Signer,
		): Promise<string | null> => {
			if (!walrusClient) {
				setState({ status: "error", blobId: null, error: "Walrus client not available" });
				return null;
			}

			setState({ status: "uploading", blobId: null, error: null });

			let lastError: Error | null = null;

			for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
				try {
					const file = WalrusFile.from({
						contents: data,
						identifier,
					});

					const flow = walrusClient.writeFilesFlow({ files: [file] });

					let certifiedBlobId: string | null = null;
					for await (const step of flow.run({
						signer,
						epochs: WALRUS_EPOCHS,
						deletable: false,
					})) {
						if (step.step === "certified") {
							certifiedBlobId = step.blobId;
						}
					}

					if (!certifiedBlobId) {
						throw new Error("Upload completed but no blob ID returned");
					}

					setState({ status: "certified", blobId: certifiedBlobId, error: null });
					return certifiedBlobId;
				} catch (err) {
					if (err instanceof RetryableWalrusClientError) {
						walrusClient.reset();
						lastError = err;
						continue;
					}
					const message = err instanceof Error ? err.message : "Upload failed";
					setState({ status: "error", blobId: null, error: message });
					return null;
				}
			}

			const message = lastError?.message ?? "Upload failed after max retries";
			setState({ status: "error", blobId: null, error: message });
			return null;
		},
		[walrusClient],
	);

	const reset = useCallback(() => {
		setState({ status: "idle", blobId: null, error: null });
	}, []);

	return { ...state, upload, reset };
}
