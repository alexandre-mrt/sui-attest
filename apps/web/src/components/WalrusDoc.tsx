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
			<div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900">
				<div className="flex items-center gap-2 text-zinc-500">
					<div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
					<span className="text-sm">Fetching from Walrus…</span>
				</div>
			</div>
		);
	}

	if (fetchState.status === "error") {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
				<p className="text-sm font-medium text-red-700 dark:text-red-400">
					Failed to load Walrus document
				</p>
				<p className="mt-1 text-sm text-red-600 dark:text-red-500">
					{fetchState.message}
				</p>
				<p className="mt-2 font-mono text-xs text-red-500 dark:text-red-600">
					Blob ID: {blobId}
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
			<div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
				<span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
					Walrus Document
				</span>
				<span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
					{blobId.slice(0, 12)}…
				</span>
			</div>
			<div className="overflow-auto p-4">
				{fetchState.status === "json" ? (
					<pre className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words">
						{JSON.stringify(fetchState.content, null, 2)}
					</pre>
				) : (
					<pre className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words">
						{fetchState.content}
					</pre>
				)}
			</div>
		</div>
	);
}
