'use client';

import { useMemo } from 'react';
import { WalrusClient } from '@mysten/walrus';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { WalrusDoc } from './WalrusDoc';
import { NETWORK, SUI_RPC_URLS } from '@/lib/constants';

interface WalrusDocViewerProps {
	blobId: string;
}

/**
 * Client-side wrapper that initializes WalrusClient and renders WalrusDoc.
 * Uses a read-only SuiGrpcClient (no wallet required) for Walrus reads.
 */
export function WalrusDocViewer({ blobId }: WalrusDocViewerProps) {
	const walrusClient = useMemo(() => {
		if (NETWORK !== 'testnet' && NETWORK !== 'mainnet') return null;
		const suiClient = new SuiGrpcClient({
			network: NETWORK,
			baseUrl: SUI_RPC_URLS[NETWORK],
		});
		return new WalrusClient({ network: NETWORK, suiClient });
	}, []);

	if (!walrusClient) {
		return (
			<p className="text-sm text-zinc-500">
				Walrus is only available on mainnet and testnet.
			</p>
		);
	}

	return <WalrusDoc blobId={blobId} walrusClient={walrusClient} />;
}
