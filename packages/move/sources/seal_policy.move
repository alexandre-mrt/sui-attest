module sui_attest::seal_policy;

use sui_attest::attestation::RevocationRegistry;

// ── Error Constants (300-range namespace) ─────────────────
const ENoAccess: u64 = 300;
const EInvalidId: u64 = 301;
const ETooManyVerifiers: u64 = 302;
const EAttestationRevoked: u64 = 303;

const MAX_VERIFIERS: u64 = 256;
const ATTESTATION_ID_OFFSET: u64 = 32;
const ATTESTATION_ID_LENGTH: u64 = 32;

// ── Types ─────────────────────────────────────────────────

public struct AttestationAllowlist has key {
    id: UID,
    attester: address,
    verifiers: vector<address>,
}

// ── Events ────────────────────────────────────────────────

public struct AllowlistCreated has copy, drop {
    allowlist_id: ID,
    attester: address,
}

public struct VerifierAdded has copy, drop {
    allowlist_id: ID,
    verifier: address,
}

public struct VerifierRemoved has copy, drop {
    allowlist_id: ID,
    verifier: address,
}

// ── Entry Functions ───────────────────────────────────────

public entry fun create_allowlist(ctx: &mut TxContext) {
    let attester = ctx.sender();
    let allowlist_uid = object::new(ctx);
    let allowlist_id = object::uid_to_inner(&allowlist_uid);

    let list = AttestationAllowlist {
        id: allowlist_uid,
        attester,
        verifiers: vector[attester],
    };

    sui::event::emit(AllowlistCreated { allowlist_id, attester });
    transfer::share_object(list);
}

public entry fun add_verifier(
    list: &mut AttestationAllowlist,
    verifier: address,
    ctx: &mut TxContext,
) {
    assert!(list.attester == ctx.sender(), ENoAccess);
    assert!(list.verifiers.length() < MAX_VERIFIERS, ETooManyVerifiers);
    if (!list.verifiers.contains(&verifier)) {
        list.verifiers.push_back(verifier);
        sui::event::emit(VerifierAdded {
            allowlist_id: object::uid_to_inner(&list.id),
            verifier,
        });
    };
}

public entry fun remove_verifier(
    list: &mut AttestationAllowlist,
    verifier: address,
    ctx: &mut TxContext,
) {
    assert!(list.attester == ctx.sender(), ENoAccess);
    assert!(verifier != list.attester, ENoAccess);
    let (found, idx) = list.verifiers.index_of(&verifier);
    if (found) {
        list.verifiers.swap_remove(idx);
        sui::event::emit(VerifierRemoved {
            allowlist_id: object::uid_to_inner(&list.id),
            verifier,
        });
    };
}

/// SEAL access policy function. Key servers call this via dry-run.
///
/// `id` format: allowlist_id (32 bytes) ++ attestation_id (32 bytes) [++ optional nonce]
/// When attestation_id is present (bytes 32..64), checks revocation status.
entry fun seal_approve(
    id: vector<u8>,
    list: &AttestationAllowlist,
    revocation_registry: &RevocationRegistry,
    ctx: &TxContext,
) {
    let list_id_bytes = object::uid_to_inner(&list.id).to_bytes();
    assert!(is_prefix(list_id_bytes, id), EInvalidId);
    assert!(list.verifiers.contains(&ctx.sender()), ENoAccess);

    if (id.length() >= ATTESTATION_ID_OFFSET + ATTESTATION_ID_LENGTH) {
        let attestation_id = extract_id(id, ATTESTATION_ID_OFFSET);
        assert!(
            !sui_attest::attestation::is_revoked(revocation_registry, attestation_id),
            EAttestationRevoked,
        );
    };
}

// ── Read Functions ────────────────────────────────────────

public fun allowlist_attester(list: &AttestationAllowlist): address {
    list.attester
}

public fun allowlist_verifiers(list: &AttestationAllowlist): &vector<address> {
    &list.verifiers
}

public fun is_verifier(list: &AttestationAllowlist, addr: address): bool {
    list.verifiers.contains(&addr)
}

// ── Internal Helpers ──────────────────────────────────────

fun is_prefix(prefix: vector<u8>, data: vector<u8>): bool {
    if (prefix.length() > data.length()) return false;
    let mut i = 0;
    while (i < prefix.length()) {
        if (prefix[i] != data[i]) return false;
        i = i + 1;
    };
    true
}

fun extract_id(data: vector<u8>, offset: u64): ID {
    let mut id_bytes = vector::empty<u8>();
    let mut i = 0;
    while (i < 32) {
        id_bytes.push_back(data[offset + i]);
        i = i + 1;
    };
    object::id_from_bytes(id_bytes)
}

// ── Test Helpers ──────────────────────────────────────────

#[test_only]
public fun create_for_testing(ctx: &mut TxContext): AttestationAllowlist {
    let attester = ctx.sender();
    AttestationAllowlist {
        id: object::new(ctx),
        attester,
        verifiers: vector[attester],
    }
}
