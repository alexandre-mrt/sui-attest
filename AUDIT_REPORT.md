# Sui Move Security Audit — sui-attest

**Project:** sui-attest (attestation protocol for Sui)
**Reviewer:** Alexandre Mourot — self-audit. No third-party audit has been performed.
**Scope:** `packages/move/sources/attestation.move`, `schema.move`, `seal_policy.move`
**Package:** SuiAttest, Move 2024 edition

Every finding carries a **Status** line saying whether it is fixed in the current
source. Findings marked OPEN are still open — this is a testnet project, and that
open list is exactly why it is not mainnet-ready.

---

## Summary

Clean module separation and correct Move 2024 patterns. No critical vulnerabilities. The main security gap is the decoupling between the attestation lifecycle and the SEAL encryption lifecycle — a revoked attestation could still be decrypted. `seal_approve` now checks the `RevocationRegistry`, but only for SEAL identities that embed the attestation ID; see H-1 for why that fix is only partial. UpgradeCap governance and shared-object versioning remain open and are blockers for mainnet.

**Overall risk: MEDIUM**

| Severity | Found | Fixed | Open |
|----------|-------|-------|------|
| CRITICAL | 0 | — | — |
| HIGH | 3 | 1 (+1 partial) | 1 (+1 partial) |
| MEDIUM | 8 | 3 | 5 |
| LOW | 6 | 6 | 0 |

---

## HIGH Findings (Fix Before Deployment)

### [H-1] seal_approve does not check revocation status
**Severity:** HIGH | **Confidence:** HIGH
**Status:** PARTIALLY FIXED — `seal_approve` now takes `&RevocationRegistry` and aborts on a revoked attestation, **but only when the SEAL identity is at least 64 bytes** (`allowlist_id || attestation_id`). The web client currently derives identities as `allowlist_id || 5-byte nonce` (37 bytes), so in that flow the revocation check does not run. Binding the identity to the attestation ID requires attesting *before* encrypting; that flow change is not implemented.
**Location:** `seal_policy.move:101-109`

**Description:**
`seal_approve` only checks that the caller is in the `verifiers` list. It does NOT check the `RevocationRegistry`. After an attester revokes an attestation, all verifiers on the allowlist can still decrypt the encrypted data indefinitely. Revocation becomes meaningless for the confidential content layer.

This is **escalated from MEDIUM to HIGH** because there is a second, inconsistent path: the attester can perform a "shadow revocation" via `remove_verifier()` — removing decryption access without ever creating a formal `RevocationRecord`. Two revocation mechanisms that do not agree with each other is worse than either one alone.

**Vulnerable Code:**
```move
entry fun seal_approve(
    id: vector<u8>,
    list: &AttestationAllowlist,
    ctx: &TxContext,
) {
    let list_id_bytes = object::uid_to_inner(&list.id).to_bytes();
    assert!(is_prefix(list_id_bytes, id), EInvalidId);
    assert!(list.verifiers.contains(&ctx.sender()), ENoAccess);
    // NO revocation check!
}
```

**Recommended Fix:**
Accept `&RevocationRegistry` and the attestation ID, then verify non-revocation before approving decryption. This requires the on-chain binding from M-1.


---

### [H-2] No explicit Sui framework dependency in Move.toml
**Severity:** HIGH | **Confidence:** HIGH
**Status:** FIXED — `Move.toml` pins `Sui` to rev `868c226`.
**Location:** `packages/move/Move.toml`

**Description:**
Move.toml contains only `[package]` and `[addresses]` with no `[dependencies]` section. The Sui framework is resolved implicitly by the CLI version. Any CLI update silently changes the framework version, potentially introducing breaking changes or deprecated APIs.

**Recommended Fix:**
```toml
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "<pinned-commit-hash>" }
```


---

### [H-3] UpgradeCap held by single EOA — no governance
**Severity:** HIGH | **Confidence:** HIGH
**Status:** OPEN — the UpgradeCap is still a single EOA. Testnet only; no governance wrapper.
**Location:** `DEPLOYED.md` — UpgradeCap `0x5b4a...acaf`

**Description:**
The UpgradeCap is owned by a single deployer address with no multisig, timelock, or governance wrapper. The deployer can unilaterally upgrade the package, potentially altering attestation logic, revocation rules, or SEAL access policies.

**Recommended Fix:**
Implement a timelock governance module (48h minimum) or restrict the upgrade policy to `additive`/`deps_only` after stabilization. Until then the trust assumption stands: the deployer can rewrite attestation, revocation and SEAL-policy logic unilaterally.


---

## MEDIUM Findings (Fix Before Mainnet)

### [M-1] No on-chain binding between Attestation and AttestationAllowlist
**Severity:** MEDIUM | **Confidence:** HIGH
**Status:** FIXED — `Attestation` carries `seal_allowlist_id: Option<ID>`, set at `attest()` and emitted in `AttestationCreated`.
**Location:** `attestation.move:28-38`, `seal_policy.move:42-55`

When `is_encrypted=true`, no field links the `Attestation` to its `AttestationAllowlist`. Consequences:
1. Encrypted attestation can exist without any allowlist (permanently undecryptable)
2. Multiple allowlists can exist with no way to determine which is authoritative
3. Verifiers cannot programmatically discover which allowlist governs decryption

**Fix:** Add `seal_allowlist_id: Option<ID>` to `Attestation`. Enforce non-None when `is_encrypted=true`.


---

### [M-2] Attestation.recipient becomes stale after transfer
**Severity:** MEDIUM | **Confidence:** HIGH
**Status:** OPEN — `Attestation` still has `store`. `recipient` means "original recipient".
**Location:** `attestation.move:28,121,139`

`Attestation` has `key + store`, enabling free transfer via `public_transfer`. After transfer, the `recipient` field still shows the original address. `verify()` does not check holder identity. Off-chain systems trusting `recipient` as "current holder" are misled.

**Fix:** Either remove `store` (soulbound), add a custom transfer function updating `recipient`, or document that `recipient` means "original recipient."


---

### [M-3] attester_registry grows monotonically — no cleanup
**Severity:** MEDIUM | **Confidence:** HIGH
**Status:** FIXED — both `revoke()` and `revoke_by_id()` remove the `attester_registry` entry.
**Location:** `attestation.move:142` (add), lines 148-210 (no remove)

Every `attest()` adds to `attester_registry`. Entries persist even after revocation (redundant with `RevocationRecord`). At ~0.003 SUI per attestation, an attacker can create millions of entries cheaply.

**Fix:** Remove `attester_registry` entry in both `revoke()` and `revoke_by_id()` after creating the `RevocationRecord`. Consider adding a small attestation fee.


---

### [M-4] SchemaRegistry unbounded growth — no deletion
**Severity:** MEDIUM | **Confidence:** MEDIUM
**Status:** FIXED — `delete_schema()` added, gated by `SchemaOwnerCap`.
**Location:** `schema.move:131`

Schemas are never deletable. Each can store ~2KB+. `SchemaOwnerCap` exists but has no `delete_schema` counterpart. The shared registry grows indefinitely.

**Fix:** Add `delete_schema(cap: SchemaOwnerCap, registry: &mut SchemaRegistry)` gated by cap.


---

### [M-5] Unilateral irreversible revocation
**Severity:** MEDIUM | **Confidence:** HIGH
**Status:** OPEN — accepted design (matches EAS). No unrevoke.
**Location:** `attestation.move:148,181`

The attester has absolute revocation power — no recipient consent, no timelock, no dispute, no unrevoke. `revoke_by_id()` doesn't even require the recipient's object. This mirrors EAS design but creates grief potential in adversarial relationships.

**Fix:** Consider adding `unrevoke()` for the original attester, or a revocation timelock. Document as explicit design tradeoff.


---

### [M-6] No pause/emergency mechanism
**Severity:** MEDIUM | **Confidence:** HIGH
**Status:** OPEN — no pause mechanism.
**Location:** All shared objects

No AdminCap, PauseCap, or circuit breaker exists. If a vulnerability is discovered post-deployment, the only option is a full package upgrade (which requires the UpgradeCap).

**Fix:** Add `paused: bool` field and `PauseCap` pattern on shared registries.


---

### [M-7] RevocationRegistry is a shared-object bottleneck
**Severity:** MEDIUM | **Confidence:** MEDIUM
**Status:** OPEN — `RevocationRegistry` is still a single shared object; issuance throughput is bounded by it.
**Location:** `attestation.move:92`

Every `attest()` takes `&mut RevocationRegistry`, serializing ALL attestation transactions through consensus. At scale, this creates significant throughput limitations.

**Fix:** Consider sharding `attester_registry` by schema_id or attester prefix. Move `attester_registry` to a separate shared object.


---

### [M-8] No version field on shared objects — no migration path
**Severity:** MEDIUM | **Confidence:** HIGH
**Status:** OPEN — no `version` field on shared objects; state-changing upgrades require a fresh publish.
**Location:** `attestation.move:42`, `schema.move:25`

SchemaRegistry, RevocationRegistry, and AttestationAllowlist lack `version: u64`. This prevents additive upgrades with state migration and already forced a full re-publish for v2→v3.

**Fix:** Add `version: u64` to all shared objects with a gated `migrate()` function.


---

## LOW Findings

| ID | Title | Status |
|----|-------|--------|
| L-1 | `verify()` return value can be silently discarded | FIXED — `assert_valid()` added as the abort-on-failure companion |
| L-2 | `SchemaOwnerCap` minted but never consumed by any function | FIXED — `delete_schema()` consumes it |
| L-3 | No `destroy()` for Attestation objects | FIXED — `destroy()` added |
| L-4 | `remove_verifier` uses O(n) `remove()` instead of `swap_remove()` | FIXED |
| L-5 | Error codes overlap across modules (all start from 0) | FIXED — namespaced 100/200/300 ranges |
| L-6 | `AttestationCreated` missing `data_hash` / `is_encrypted` | FIXED — event now carries `data_hash`, `is_encrypted`, `seal_allowlist_id` |

---

## Remaining work

Before this could be considered for mainnet:

1. **H-1 (partial)** — bind the SEAL identity to the attestation ID so the
   revocation check in `seal_approve` actually runs. Requires reordering the
   client flow (attest, then encrypt with `allowlist_id || attestation_id`, then
   attach the Walrus blob), which in turn needs a Move function to set the blob
   ID after issuance.
2. **H-3** — UpgradeCap governance (multisig or timelock), or lock the upgrade
   policy down to `additive` / `deps_only`.
3. **M-8** — `version: u64` on every shared object plus a `migrate()` path, so
   future changes stop requiring a fresh publish and a state reset.
4. **M-6** — a pause capability on the registries.
5. **M-7** — shard or split `RevocationRegistry`; today every `attest()` takes it
   mutably, so issuance is serialized through consensus.
6. **M-2** — decide: soulbound `Attestation` (drop `store`), or a transfer
   function that keeps `recipient` current, or document `recipient` as
   "original recipient" everywhere it is read.

---

## Positive Security Properties

1. **Self-attestation prevention** — `assert!(attester != recipient, ESelfAttestation)`
2. **Double-revocation prevention** — Both revoke functions check `EAlreadyRevoked`
3. **Attester-only revocation** — Verified via `ctx.sender()` in all paths
4. **Dual revocation path** — `revoke()` + `revoke_by_id()` handles both owned and wrapped attestations
5. **Correct Move 2024 compliance** — No deprecated friend, proper public(package), method syntax
6. **Consistent Clock usage** — All timestamps in milliseconds, correct inequality directions
7. **Complete event coverage** — All 7 state-mutating functions emit events
8. **SEAL entry-only pattern** — `seal_approve` correctly uses `entry` for upgradeability
9. **Shared objects lack store** — Prevents wrapping/extraction of registries
10. **Attester self-inclusion in allowlist** — Cannot accidentally lock self out of encrypted data
11. **No arithmetic attack surface** — Zero shift/multiplication/division operations
12. **No oracle dependency** — Pure attestation logic, no price manipulation risk

---

---

## Method and limits

Manual review of all Move sources, one vulnerability class at a time: arithmetic,
access control, ability/type safety, object model and ownership, hot-potato and
flash-loan patterns, oracle surface (none here), economic incentives, cryptography
and identity (SEAL), infrastructure and upgrade policy, cross-module composition.
Findings were then cross-checked against each other (e.g. "no allowlist binding"
plus "no revocation check in `seal_approve`" together are what makes H-1 HIGH
rather than MEDIUM).

Limits, plainly:

- Single reviewer, no external audit.
- No fuzzing, no formal verification, no on-chain adversarial simulation.
- The 14 Move unit tests cover the lifecycle and the error paths, not the
  economic or upgrade-governance findings.
- Off-chain components (SDK, web app, Walrus integration) were not in scope.
