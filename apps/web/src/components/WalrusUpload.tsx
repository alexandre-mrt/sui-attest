"use client";

import { useCallback, useRef, useState } from "react";

interface WalrusUploadProps {
	label?: string;
	accept?: string;
	onFile: (bytes: Uint8Array, name: string) => void;
	onClear?: () => void;
	disabled?: boolean;
	className?: string;
}

/**
 * File input that reads a file and returns its raw bytes.
 * Does NOT upload to Walrus — the parent handles upload with wallet signing.
 */
export function WalrusUpload({
	label = "Attach document",
	accept = ".json,.txt,.pdf",
	onFile,
	onClear,
	disabled = false,
	className = "",
}: WalrusUploadProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			setError(null);

			try {
				const arrayBuffer = await file.arrayBuffer();
				const bytes = new Uint8Array(arrayBuffer);
				setFileName(file.name);
				onFile(bytes, file.name);
			} catch {
				setError("Failed to read file");
			}
		},
		[onFile],
	);

	const handleClear = useCallback(() => {
		setFileName(null);
		setError(null);
		if (inputRef.current) {
			inputRef.current.value = "";
		}
		onClear?.();
	}, [onClear]);

	return (
		<div className={`flex flex-col gap-1 ${className}`}>
			<span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
				{label}
				<span className="ml-1 text-xs text-zinc-400">(optional)</span>
			</span>

			{fileName ? (
				<div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900">
					<span className="flex-1 truncate text-sm text-zinc-700 dark:text-zinc-300">
						{fileName}
					</span>
					<button
						type="button"
						onClick={handleClear}
						disabled={disabled}
						className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-50"
					>
						Remove
					</button>
				</div>
			) : (
				<label
					className={`flex cursor-pointer items-center justify-center rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800 ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
				>
					<span className="text-sm text-zinc-500 dark:text-zinc-400">
						Click to select file
					</span>
					<input
						ref={inputRef}
						type="file"
						accept={accept}
						onChange={handleChange}
						disabled={disabled}
						className="sr-only"
					/>
				</label>
			)}

			{error && (
				<p className="text-xs text-red-500">{error}</p>
			)}

			<p className="text-xs text-zinc-400">
				Accepted: {accept}. Will be stored on Walrus decentralized storage.
			</p>
		</div>
	);
}
