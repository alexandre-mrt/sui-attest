"use client";

import { useState, useEffect } from "react";
import { WalrusClient } from "@mysten/walrus";

interface WalrusDocProps {
	blobId: string;
	walrusClient: WalrusClient;
}

type FetchState =
	| { status: "loading" }
	| { status: "json"; content: Record<string, unknown> }
	| { status: "text"; content: string }
	| { status: "error"; message: string };

/**
 * Fetches and displays a Walrus blob by its blob ID.
 * Attempts to parse content as JSON; falls back to raw text.
 */
export function WalrusDoc({ blobId, walrusClient }: WalrusDocProps) {
	const [fetchState, setFetchState] = useState<FetchState>({ status: "loading" });

	useEffect(() => {
		let cancelled = false;

		async function fetchBlob() {
			try {
				const bytes = await walrusClient.readBlob({ blobId });
				if (cancelled) return;

				const text = new TextDecoder().decode(bytes);
				try {
					const parsed = JSON.parse(text) as Record<string, unknown>;
					setFetchState({ status: "json", content: parsed });
				} catch {
					setFetchState({ status: "text", content: text });
				}
			} catch (err) {
				if (cancelled) return;
				const message = err instanceof Error ? err.message : "Failed to fetch blob";
				setFetchState({ status: "error", message });
			}
		}

		void fetchBlob();
		return () => {
			cancelled = true;
		};
	}, [blobId, walrusClient]);

	if (fetchState.status === "loading") {
		return (
			<div className="rounded-xl border border-border bg-bg-surface p-5">
				<div className="flex items-center gap-2 text-text-secondary">
					<div className="h-4 w-4 animate-spin rounded-full border-2 border-text-tertiary border-t-accent" />
					<span className="text-sm">Fetching from Walrus...</span>
				</div>
			</div>
		);
	}

	if (fetchState.status === "error") {
		return (
			<div className="rounded-xl border border-revoked/20 bg-revoked/10 p-5">
				<p className="text-sm font-medium text-revoked">
					Failed to load Walrus document
				</p>
				<p className="mt-1 text-sm text-revoked/80">
					{fetchState.message}
				</p>
				<p className="mt-2 font-mono text-[13px] text-revoked/60">
					Blob ID: {blobId}
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-border bg-bg-surface">
			<div className="flex items-center justify-between border-b border-border px-5 py-2">
				<span className="text-[13px] font-medium uppercase tracking-wider text-text-secondary">
					Walrus Document
				</span>
				<span className="font-mono text-[13px] text-text-tertiary">
					{blobId.slice(0, 12)}...
				</span>
			</div>
			<div className="overflow-auto p-5">
				{fetchState.status === "json" ? (
					<pre className="whitespace-pre-wrap break-words font-mono text-sm text-text-primary">
						{JSON.stringify(fetchState.content, null, 2)}
					</pre>
				) : (
					<pre className="whitespace-pre-wrap break-words font-mono text-sm text-text-primary">
						{fetchState.content}
					</pre>
				)}
			</div>
		</div>
	);
}
