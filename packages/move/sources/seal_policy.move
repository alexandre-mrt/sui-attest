module sui_attest::seal_policy;

// ── Constants ─────────────────────────────────────────────
const ENoAccess: u64 = 0;
const EInvalidId: u64 = 1;

// ── Types ─────────────────────────────────────────────────

/// Allowlist for controlling who can decrypt encrypted attestations.
/// The attester creates this and adds verifiers (including the recipient).
/// Shared object so SEAL key servers can access it during dry-run.
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

/// Create a new allowlist for encrypted attestations.
/// The attester is automatically added as a verifier so they can always decrypt.
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

/// Add a verifier to the allowlist.
/// Only the original attester can add verifiers.
public entry fun add_verifier(
    list: &mut AttestationAllowlist,
    verifier: address,
    ctx: &mut TxContext,
) {
    assert!(list.attester == ctx.sender(), ENoAccess);
    if (!list.verifiers.contains(&verifier)) {
        list.verifiers.push_back(verifier);
        sui::event::emit(VerifierAdded {
            allowlist_id: object::uid_to_inner(&list.id),
            verifier,
        });
    };
}

/// Remove a verifier from the allowlist.
/// Only the attester can remove verifiers. Attester cannot remove themselves.
public entry fun remove_verifier(
    list: &mut AttestationAllowlist,
    verifier: address,
    ctx: &mut TxContext,
) {
    assert!(list.attester == ctx.sender(), ENoAccess);
    assert!(verifier != list.attester, ENoAccess);
    let (found, idx) = list.verifiers.index_of(&verifier);
    if (found) {
        list.verifiers.remove(idx);
        sui::event::emit(VerifierRemoved {
            allowlist_id: object::uid_to_inner(&list.id),
            verifier,
        });
    };
}

/// SEAL access policy function. Key servers call this via dry-run to determine
/// if the caller has access to decrypt.
///
/// `id` = allowlist object ID bytes (32 bytes) ++ optional random nonce
/// This is `entry` (not `public`) for upgradeability — existing ciphertexts
/// still reference the original packageId and this function signature.
/// No state writes — runs as dry-run only.
entry fun seal_approve(
    id: vector<u8>,
    list: &AttestationAllowlist,
    ctx: &TxContext,
) {
    let list_id_bytes = object::uid_to_inner(&list.id).to_bytes();
    assert!(is_prefix(list_id_bytes, id), EInvalidId);
    assert!(list.verifiers.contains(&ctx.sender()), ENoAccess);
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
