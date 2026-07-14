# SuiAttest

An attestation protocol for Sui: an attester registers a **schema**, issues an
**attestation** to a recipient, and can **revoke** it later. Anyone can verify an
attestation on-chain. Move contracts, a TypeScript SDK, and a Next.js app, all
running against Sui testnet.

## The design problem: revocation vs. ownership

An attestation is a credential *about* somebody, so it should belong to that
somebody. On Sui the natural encoding is an **owned object** transferred to the
recipient. That gives the recipient custody, cheap parallel reads, and no
consensus cost — but it also means the **attester can no longer touch the
object**. Only the owner can pass an owned object into a transaction. So the
issuer of a credential cannot revoke it. That is a real conflict between
credential semantics and Sui's ownership model, not a hypothetical one.

SuiAttest resolves it by splitting custody from status:

- **`Attestation`** — an owned object, transferred to the recipient. The
  recipient's property; the attester never needs it again.
- **`RevocationRegistry`** — a shared object holding two tables:
  `attester_registry: Table<ID, address>` (who issued which attestation) and
  `revocations: Table<ID, RevocationRecord>`.

`attest()` writes the attester into `attester_registry` at issuance. Revocation
then works *without the owned object*:

```move
public entry fun revoke_by_id(
    revocation_registry: &mut RevocationRegistry,
    attestation_id: ID,
    reason: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(revocation_registry.attester_registry.contains(attestation_id), EAttestationNotRegistered);
    let attester = *revocation_registry.attester_registry.borrow(attestation_id);
    assert!(ctx.sender() == attester, ENotAttester);          // authority comes from the registry,
    assert!(!revocation_registry.revocations.contains(attestation_id), EAlreadyRevoked);
    // ... write RevocationRecord, emit AttestationRevoked
}
```

The attester's authority is proven by a *shared-object table lookup*, not by
holding a capability object. The recipient keeps custody of the credential; the
attester keeps control of its validity. Verification is `verify()` on the owned
object plus an `is_revoked()` lookup in the shared registry.

The tradeoff is explicit: every `attest()` takes `&mut RevocationRegistry`, so
issuance goes through consensus rather than the fast path. Issuance is the rare
operation and verification is the common one, so paying consensus at issuance is
the right side of the trade — but at high issuance volume the single shared
registry is a bottleneck (see Limitations).

`revoke()` (attester passes the object, if they happen to hold it) is kept as
well; both paths write the same `RevocationRecord`, so verifiers only ever read
one source of truth.

## Model

```
schema.move           SchemaRegistry (shared)  — Table<ID, SchemaRecord>
                      create_schema / get_schema / delete_schema (gated by SchemaOwnerCap)

attestation.move      Attestation (owned, key + store) — schema_id, attester, recipient,
                                                          data_hash, expires_at, walrus_blob_id
                      RevocationRegistry (shared) — attester_registry + revocations
                      attest / revoke / revoke_by_id / verify / assert_valid / is_revoked

seal_policy.move      AttestationAllowlist (shared) + seal_approve — SEAL access policy
                      for encrypted attestation payloads
```

- **Schema**: name, description, and parallel `field_names` / `field_types` /
  `field_required` vectors. Optionally a Walrus blob ID for a fuller schema
  document.
- **Attestation**: stores only the SHA-256 `data_hash` of the credential
  payload (exactly 32 bytes, enforced on-chain). The payload itself lives
  off-chain — plaintext on Walrus, or SEAL-encrypted on Walrus.
- **Revocation**: `revoke_by_id` as described above. Revocation is unilateral
  and permanent (no unrevoke).
- **Encryption**: `seal_approve` gates decryption on the `AttestationAllowlist`
  (the caller must be a listed verifier). It *also* contains a revocation check
  against `RevocationRegistry`, but that branch only runs when the SEAL identity
  is ≥ 64 bytes (`allowlist_id || attestation_id`). The clients build 37-byte
  identities (`allowlist_id || 5-byte nonce`), so **today revocation does not cut
  off decryption** — the payload of a revoked attestation stays decryptable by
  anyone on the allowlist. See H-1 under Security.

## Deployed (testnet)

| Object | ID |
|--------|----|
| Package | `0xad9694dd2e550d1d0323c020f476f68e634b9b251bde4f72dccc9c1221b0d86f` |
| SchemaRegistry | `0xee6f0b2a0ef8ce839b3690391718175ab64d3039c55fff6d1fa29e9be8073c4c` |
| RevocationRegistry | `0x72169c41300e41991ca88ef14ecaff3261ee4a510b9f9bff5702ccd9cbeae2d3` |

Publish tx `3ASLmrVhfEqmtwpJtBj9A2SLPHTGXf6fikPqLqoUPf55`. See `DEPLOYED.md` for
the UpgradeCap and the superseded packages.

## Repository

```
packages/move/   Move 2024 package: schema, attestation, seal_policy (695 LOC)
packages/sdk/    TypeScript SDK (@sui-attest/sdk) over @mysten/sui 2.x (gRPC + GraphQL)
apps/web/        Next.js 16 app: create schema, issue, explore, verify, decrypt
scripts/         End-to-end lifecycle test against testnet
```

## Build and test

```bash
# Move contracts — 14 unit tests
cd packages/move && sui move test

# SDK — 43 unit tests (transaction building, BCS/option parsing, hashing)
cd packages/sdk && bun install && bun test

# Web app
cd apps/web && bun install && bun run build

# End-to-end on testnet (needs a funded testnet key)
cd scripts && bun install
SUI_PRIVATE_KEY=suiprivkey1... bun run e2e-test.ts
```

The e2e script runs the whole lifecycle on the deployed package: create schema →
attest → verify (valid) → `revoke_by_id` → verify (revoked). Last run: 5/5 steps
passed, transaction digests in `scripts/E2E_RESULTS.md`.

## Security

`AUDIT_REPORT.md` is a **self-audit** of the Move code — my own review, not a
third-party audit: 3 HIGH, 8 MEDIUM, 6 LOW findings, each carrying a status line
(fixed / partially fixed / open). Fixed:

- **No on-chain link between an `Attestation` and its `AttestationAllowlist`**
  (M-1) — fixed with a `seal_allowlist_id: Option<ID>` field.
- **Unpinned Sui framework dependency** (H-2) — `Move.toml` now pins a rev.
- All six LOW findings, and M-3 / M-4.

The most interesting finding is the one that is *not* fully fixed:

- **H-1, partially fixed.** `seal_approve` originally ignored revocation, so a
  revoked encrypted attestation stayed decryptable forever by anyone on the
  allowlist. It now takes `&RevocationRegistry` and aborts on a revoked
  attestation — **but only when the SEAL identity is ≥ 64 bytes**
  (`allowlist_id || attestation_id`). Both clients — the SDK's
  `encryptAttestation` and the web app's `useSeal` hook — derive identities as
  `allowlist_id || 5-byte nonce` (37 bytes), because encryption happens *before*
  the attestation exists and its ID is therefore unknown. In that flow the
  revocation check is inert. Fixing it properly means attesting first, then
  encrypting with the attestation ID in the identity, then attaching the Walrus
  blob — which needs a Move function to set the blob ID after issuance. Not done.

## Limitations (honest list)

- **Not audited by anyone else.** Not for mainnet as-is.
- **H-1 is only partially fixed** (above): revocation does not currently cut off
  decryption, because the identities the clients build never reach the length
  that activates the on-chain revocation check.
- **Other open findings**: the UpgradeCap is a single EOA with no timelock or
  multisig (H-3); no pause mechanism (M-6); shared objects carry no `version`
  field, so state-changing upgrades need a fresh publish (M-8) — which is why
  four testnet packages exist; `RevocationRegistry` is a single shared object and
  therefore a throughput ceiling on issuance (M-7); `Attestation` has `store`, so
  it can be transferred and its `recipient` field then goes stale (M-2).
- **Walrus and SEAL are wired in the web app** (`@mysten/walrus` `writeBlob` for
  schema/credential blobs; `@mysten/seal` for encrypt/decrypt against the
  on-chain allowlist policy) but they run **through the wallet in the browser**
  and have no automated coverage. The 43 SDK tests cover transaction building,
  parsing and hashing — not Walrus or SEAL. The e2e evidence in this repo covers
  schema / attest / verify / revoke only.
- **No indexer.** The explorer reads events over GraphQL — fine for a demo, not
  for production query loads.
- Testnet only.

## License

MIT
