'use client';

/**
 * useSeal — React hook for SEAL threshold encryption/decryption.
 *
 * Manages session key lifecycle and provides encrypt/decrypt functions
 * for attestation data. Session key is cached and reused until expiry.
 */

import { useRef, useCallback, useMemo } from 'react';
import { useDAppKit, useWalletConnection } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { SealClient, SessionKey, EncryptedObject } from '@mysten/seal';
import { Transaction } from '@mysten/sui/transactions';
import { fromHex, toHex } from '@mysten/sui/utils';
import {
  PACKAGE_ID,
  NETWORK,
  SEAL_KEY_SERVERS,
  SEAL_THRESHOLD,
  SESSION_KEY_TTL_MIN,
  SUI_RPC_URLS,
} from '@/lib/constants';

const MODULE_SEAL_POLICY = 'seal_policy';

// ── Internal helpers ──────────────────────────────────────────────────────

function buildAllowlistIdentity(allowlistId: string): string {
  const nonce = crypto.getRandomValues(new Uint8Array(5));
  const idStr = allowlistId.startsWith('0x') ? allowlistId.slice(2) : allowlistId;
  const idBytes = fromHex(idStr);
  return toHex(new Uint8Array([...idBytes, ...nonce]));
}

function parseAllowlistId(sealId: string): string {
  const idStr = sealId.startsWith('0x') ? sealId.slice(2) : sealId;
  const bytes = fromHex(idStr);
  return `0x${toHex(bytes.slice(0, 32))}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────

export interface UseSealReturn {
  /**
   * Create an AttestationAllowlist on-chain.
   * Returns the allowlist object ID after the tx is confirmed.
   */
  createAllowlist: () => Promise<string>;

  /**
   * Add a verifier to an existing allowlist.
   */
  addVerifier: (allowlistId: string, verifier: string) => Promise<void>;

  /**
   * Encrypt data using SEAL.
   * Returns encrypted bytes + the sealId to store alongside the blob.
   */
  encrypt: (
    data: Uint8Array,
    allowlistId: string,
  ) => Promise<{ encryptedBytes: Uint8Array; sealId: string }>;

  /**
   * Decrypt SEAL-encrypted bytes.
   * Prompts user to sign a personal message if session key is not yet active.
   */
  decrypt: (encryptedBytes: Uint8Array) => Promise<Uint8Array>;
}

export function useSeal(): UseSealReturn {
  const dAppKit = useDAppKit();
  const connection = useWalletConnection();
  const currentAccount = connection.account;
  const sessionKeyRef = useRef<SessionKey | null>(null);

  // Stable client instances (created once, not on every render)
  const suiClient = useMemo(
    () => new SuiGrpcClient({ network: 'testnet', baseUrl: SUI_RPC_URLS.testnet }),
    [],
  );

  const sealClient = useMemo(
    () =>
      new SealClient({
        suiClient,
        serverConfigs: [...SEAL_KEY_SERVERS],
        verifyKeyServers: (NETWORK as string) === 'mainnet',
      }),
    [suiClient],
  );

  // ── Session Key ──────────────────────────────────────────────────────────

  const getSessionKey = useCallback(async (): Promise<SessionKey> => {
    if (sessionKeyRef.current && !sessionKeyRef.current.isExpired()) {
      return sessionKeyRef.current;
    }

    const address = currentAccount?.address;
    if (!address) throw new Error('Wallet not connected');

    const sk = await SessionKey.create({
      address,
      packageId: PACKAGE_ID,
      ttlMin: SESSION_KEY_TTL_MIN,
      suiClient,
    });

    const message = sk.getPersonalMessage();
    const { signature } = await dAppKit.signPersonalMessage({ message });
    await sk.setPersonalMessageSignature(signature);

    sessionKeyRef.current = sk;
    return sk;
  }, [currentAccount, dAppKit, suiClient]);

  // ── Allowlist Management ─────────────────────────────────────────────────

  const createAllowlist = useCallback(async (): Promise<string> => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_SEAL_POLICY}::create_allowlist`,
      arguments: [],
    });

    const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
    if (result.$kind !== 'Transaction') {
      throw new Error('createAllowlist transaction failed');
    }

    // Extract the AllowlistCreated event to get the allowlist ID
    const digest = result.Transaction.digest;
    // Wait a moment for indexer propagation then fetch the tx effects
    await new Promise((r) => setTimeout(r, 2000));

    const txResult = await suiClient.getTransaction({
      digest,
      include: { effects: true },
    });

    const txInfo = txResult.$kind === 'Transaction' ? txResult.Transaction : null;
    if (!txInfo) {
      throw new Error('Transaction not found or failed');
    }

    // Find the created shared object (the allowlist) in effects
    const created = txInfo.effects?.changedObjects.find(
      (c) => c.idOperation === 'Created' && c.outputOwner?.$kind === 'Shared',
    );

    if (!created) {
      throw new Error('Could not find created allowlist object in transaction');
    }

    return created.objectId;
  }, [dAppKit, suiClient]);

  const addVerifier = useCallback(
    async (allowlistId: string, verifier: string): Promise<void> => {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_SEAL_POLICY}::add_verifier`,
        arguments: [tx.object(allowlistId), tx.pure.address(verifier)],
      });

      const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      if (result.$kind !== 'Transaction') {
        throw new Error('addVerifier transaction failed');
      }
    },
    [dAppKit],
  );

  // ── Encrypt ──────────────────────────────────────────────────────────────

  const encrypt = useCallback(
    async (
      data: Uint8Array,
      allowlistId: string,
    ): Promise<{ encryptedBytes: Uint8Array; sealId: string }> => {
      const sealId = buildAllowlistIdentity(allowlistId);

      const { encryptedObject } = await sealClient.encrypt({
        threshold: SEAL_THRESHOLD,
        packageId: PACKAGE_ID,
        id: sealId,
        data,
      });

      return { encryptedBytes: encryptedObject, sealId };
    },
    [sealClient],
  );

  // ── Decrypt ──────────────────────────────────────────────────────────────

  const decrypt = useCallback(
    async (encryptedBytes: Uint8Array): Promise<Uint8Array> => {
      const sessionKey = await getSessionKey();
      const parsed = EncryptedObject.parse(encryptedBytes);
      const allowlistId = parseAllowlistId(parsed.id);

      const sealIdBytes = fromHex(
        parsed.id.startsWith('0x') ? parsed.id.slice(2) : parsed.id,
      );

      const tx = new Transaction();
      tx.moveCall({
        target: `${parsed.packageId}::${MODULE_SEAL_POLICY}::seal_approve`,
        arguments: [
          tx.pure.vector('u8', Array.from(sealIdBytes)),
          tx.object(allowlistId),
        ],
      });

      const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });

      const decrypted = await sealClient.decrypt({
        data: encryptedBytes,
        sessionKey,
        txBytes,
      });

      return decrypted;
    },
    [sealClient, getSessionKey, suiClient],
  );

  return { createAllowlist, addVerifier, encrypt, decrypt };
}
