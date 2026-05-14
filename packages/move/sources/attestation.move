module sui_attest::attestation;

use sui::clock::Clock;
use sui::event;
use sui::table::{Self, Table};
use sui_attest::schema::SchemaRegistry;

// ── Constants ─────────────────────────────────────────────
const MAX_DATA_HASH_LENGTH: u64 = 32; // SHA-256
const MAX_REASON_LENGTH: u64 = 256;

// ── Error Constants (100-range namespace) ─────────────────
const ENotAttester: u64 = 100;
const EAlreadyRevoked: u64 = 101;
const EExpired: u64 = 102;
const ESchemaNotFound: u64 = 103;
const ENotRevoked: u64 = 104;
const ESelfAttestation: u64 = 105;
const EInvalidExpiry: u64 = 106;
const EInvalidDataHash: u64 = 107;
const EReasonTooLong: u64 = 108;
const EAttestationNotRegistered: u64 = 109;
const EEncryptedRequiresAllowlist: u64 = 110;
const ENotValid: u64 = 111;

// ── Types ─────────────────────────────────────────────────

public struct Attestation has key, store {
    id: UID,
    schema_id: ID,
    attester: address,
    recipient: address,
    data_hash: vector<u8>,
    walrus_blob_id: Option<u256>,
    created_at: u64,
    expires_at: Option<u64>,
    is_encrypted: bool,
    seal_allowlist_id: Option<ID>,
}

public struct RevocationRegistry has key {
    id: UID,
    revocations: Table<ID, RevocationRecord>,
    attester_registry: Table<ID, address>,
}

public struct RevocationRecord has store {
    attester: address,
    revoked_at: u64,
    reason: vector<u8>,
}

// ── Events ────────────────────────────────────────────────

public struct AttestationCreated has copy, drop {
    attestation_id: ID,
    schema_id: ID,
    attester: address,
    recipient: address,
    data_hash: vector<u8>,
    walrus_blob_id: Option<u256>,
    expires_at: Option<u64>,
    is_encrypted: bool,
    seal_allowlist_id: Option<ID>,
    timestamp: u64,
}

public struct AttestationRevoked has copy, drop {
    attestation_id: ID,
    attester: address,
    reason: vector<u8>,
    timestamp: u64,
}

// ── Module Initializer ────────────────────────────────────

fun init(ctx: &mut TxContext) {
    let registry = RevocationRegistry {
        id: object::new(ctx),
        revocations: table::new(ctx),
        attester_registry: table::new(ctx),
    };
    transfer::share_object(registry);
}

// ── Entry Functions ───────────────────────────────────────

public entry fun attest(
    schema_registry: &SchemaRegistry,
    revocation_registry: &mut RevocationRegistry,
    schema_id: ID,
    recipient: address,
    data_hash: vector<u8>,
    walrus_blob_id: Option<u256>,
    expires_at: Option<u64>,
    is_encrypted: bool,
    seal_allowlist_id: Option<ID>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let attester = ctx.sender();
    assert!(attester != recipient, ESelfAttestation);
    assert!(schema_registry.schema_exists(schema_id), ESchemaNotFound);
    assert!(data_hash.length() == MAX_DATA_HASH_LENGTH, EInvalidDataHash);

    if (is_encrypted) {
        assert!(seal_allowlist_id.is_some(), EEncryptedRequiresAllowlist);
    };

    let timestamp = clock.timestamp_ms();

    if (expires_at.is_some()) {
        assert!(*expires_at.borrow() > timestamp, EInvalidExpiry);
    };

    let attestation_uid = object::new(ctx);
    let attestation_id = object::uid_to_inner(&attestation_uid);

    let attestation = Attestation {
        id: attestation_uid,
        schema_id,
        attester,
        recipient,
        data_hash,
        walrus_blob_id,
        created_at: timestamp,
        expires_at,
        is_encrypted,
        seal_allowlist_id,
    };

    event::emit(AttestationCreated {
        attestation_id,
        schema_id,
        attester,
        recipient,
        data_hash: attestation.data_hash,
        walrus_blob_id,
        expires_at,
        is_encrypted,
        seal_allowlist_id,
        timestamp,
    });

    transfer::transfer(attestation, recipient);

    revocation_registry.attester_registry.add(attestation_id, attester);
}

public entry fun revoke(
    revocation_registry: &mut RevocationRegistry,
    attestation: &Attestation,
    reason: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(ctx.sender() == attestation.attester, ENotAttester);
    assert!(reason.length() <= MAX_REASON_LENGTH, EReasonTooLong);

    let attestation_id = object::uid_to_inner(&attestation.id);
    assert!(!revocation_registry.revocations.contains(attestation_id), EAlreadyRevoked);

    let timestamp = clock.timestamp_ms();

    let record = RevocationRecord {
        attester: attestation.attester,
        revoked_at: timestamp,
        reason,
    };

    revocation_registry.revocations.add(attestation_id, record);

    if (revocation_registry.attester_registry.contains(attestation_id)) {
        revocation_registry.attester_registry.remove(attestation_id);
    };

    event::emit(AttestationRevoked {
        attestation_id,
        attester: attestation.attester,
        reason: revocation_registry.revocations.borrow(attestation_id).reason,
        timestamp,
    });
}

public entry fun revoke_by_id(
    revocation_registry: &mut RevocationRegistry,
    attestation_id: ID,
    reason: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(revocation_registry.attester_registry.contains(attestation_id), EAttestationNotRegistered);
    let attester = *revocation_registry.attester_registry.borrow(attestation_id);
    assert!(ctx.sender() == attester, ENotAttester);
    assert!(reason.length() <= MAX_REASON_LENGTH, EReasonTooLong);
    assert!(!revocation_registry.revocations.contains(attestation_id), EAlreadyRevoked);

    let timestamp = clock.timestamp_ms();

    let record = RevocationRecord {
        attester,
        revoked_at: timestamp,
        reason,
    };

    revocation_registry.revocations.add(attestation_id, record);

    revocation_registry.attester_registry.remove(attestation_id);

    event::emit(AttestationRevoked {
        attestation_id,
        attester,
        reason: revocation_registry.revocations.borrow(attestation_id).reason,
        timestamp,
    });
}

public entry fun destroy(attestation: Attestation) {
    let Attestation {
        id,
        schema_id: _,
        attester: _,
        recipient: _,
        data_hash: _,
        walrus_blob_id: _,
        created_at: _,
        expires_at: _,
        is_encrypted: _,
        seal_allowlist_id: _,
    } = attestation;
    object::delete(id);
}

// ── Public Read Functions ─────────────────────────────────

public fun verify(
    revocation_registry: &RevocationRegistry,
    attestation: &Attestation,
    clock: &Clock,
): bool {
    let attestation_id = object::uid_to_inner(&attestation.id);

    if (revocation_registry.revocations.contains(attestation_id)) {
        return false
    };

    if (attestation.expires_at.is_some()) {
        let expiry = *attestation.expires_at.borrow();
        if (clock.timestamp_ms() >= expiry) {
            return false
        };
    };

    true
}

public fun assert_valid(
    revocation_registry: &RevocationRegistry,
    attestation: &Attestation,
    clock: &Clock,
) {
    assert!(verify(revocation_registry, attestation, clock), ENotValid);
}

public fun is_revoked(
    revocation_registry: &RevocationRegistry,
    attestation_id: ID,
): bool {
    revocation_registry.revocations.contains(attestation_id)
}

// ── Accessor Functions ────────────────────────────────────

public fun attester(attestation: &Attestation): address {
    attestation.attester
}

public fun recipient(attestation: &Attestation): address {
    attestation.recipient
}

public fun schema_id(attestation: &Attestation): ID {
    attestation.schema_id
}

public fun data_hash(attestation: &Attestation): &vector<u8> {
    &attestation.data_hash
}

public fun walrus_blob_id(attestation: &Attestation): &Option<u256> {
    &attestation.walrus_blob_id
}

public fun created_at(attestation: &Attestation): u64 {
    attestation.created_at
}

public fun expires_at(attestation: &Attestation): &Option<u64> {
    &attestation.expires_at
}

public fun is_encrypted(attestation: &Attestation): bool {
    attestation.is_encrypted
}

public fun seal_allowlist_id(attestation: &Attestation): &Option<ID> {
    &attestation.seal_allowlist_id
}

// ── Test Helpers ──────────────────────────────────────────

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
