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
			<span className="text-[13px] font-medium uppercase tracking-wider text-text-secondary">
				{label}
				<span className="ml-1 normal-case tracking-normal text-text-tertiary">(optional)</span>
			</span>

			{fileName ? (
				<div className="flex items-center gap-2 rounded-lg border border-border bg-bg-surface px-3 py-2">
					<span className="flex-1 truncate text-sm text-text-primary">
						{fileName}
					</span>
					<button
						type="button"
						onClick={handleClear}
						disabled={disabled}
						className="text-[13px] text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
					>
						Remove
					</button>
				</div>
			) : (
				<label
					className={`flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-border p-6 transition-[border-color] duration-200 hover:border-border-hover ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
				>
					<span className="text-sm text-text-secondary">
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
				<p className="text-[13px] text-revoked">{error}</p>
			)}

			<p className="text-[13px] text-text-tertiary">
				Accepted: {accept}. Will be stored on Walrus decentralized storage.
			</p>
		</div>
	);
}
