module sui_attest::attestation;

use sui::clock::Clock;
use sui::event;
use sui::table::{Self, Table};
use sui_attest::schema::SchemaRegistry;

// ── Constants ─────────────────────────────────────────────
const MAX_DATA_HASH_LENGTH: u64 = 32; // SHA-256
const MAX_REASON_LENGTH: u64 = 256;

// ── Error Constants ───────────────────────────────────────
const ENotAttester: u64 = 0;
const EAlreadyRevoked: u64 = 1;
const EExpired: u64 = 2;
const ESchemaNotFound: u64 = 3;
const ENotRevoked: u64 = 4;
const ESelfAttestation: u64 = 5;
const EInvalidExpiry: u64 = 6;
const EInvalidDataHash: u64 = 7;
const EReasonTooLong: u64 = 8;

// ── Types ─────────────────────────────────────────────────

/// The core attestation object. Owned by the recipient.
/// key + store = freely transferable.
public struct Attestation has key, store {
    id: UID,
    schema_id: ID,
    attester: address,
    recipient: address,
    data_hash: vector<u8>,         // SHA-256 of the attestation data
    walrus_blob_id: Option<u256>,  // full credential doc on Walrus
    created_at: u64,               // milliseconds (from Clock)
    expires_at: Option<u64>,       // milliseconds, None = never expires
    is_encrypted: bool,            // true if data is SEAL-encrypted
}

/// Shared revocation registry. Separate from attestations so attester
/// can revoke without needing the recipient's owned object.
public struct RevocationRegistry has key {
    id: UID,
    revocations: Table<ID, RevocationRecord>,
    attester_registry: Table<ID, address>,
}

/// Record of a revocation.
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
    walrus_blob_id: Option<u256>,
    expires_at: Option<u64>,
    timestamp: u64,
}

public struct AttestationRevoked has copy, drop {
    attestation_id: ID,
    attester: address,
    reason: vector<u8>,
    timestamp: u64,
}

// ── Module Initializer ────────────────────────────────────

/// Module initializer — creates the shared RevocationRegistry.
fun init(ctx: &mut TxContext) {
    let registry = RevocationRegistry {
        id: object::new(ctx),
        revocations: table::new(ctx),
        attester_registry: table::new(ctx),
    };
    transfer::share_object(registry);
}

// ── Entry Functions ───────────────────────────────────────

/// Issue an attestation. Creates an Attestation object and transfers
/// it to the recipient. Validates schema exists.
public entry fun attest(
    schema_registry: &SchemaRegistry,
    revocation_registry: &mut RevocationRegistry,
    schema_id: ID,
    recipient: address,
    data_hash: vector<u8>,
    walrus_blob_id: Option<u256>,
    expires_at: Option<u64>,
    is_encrypted: bool,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let attester = ctx.sender();
    assert!(attester != recipient, ESelfAttestation);
    assert!(schema_registry.schema_exists(schema_id), ESchemaNotFound);
    assert!(data_hash.length() == MAX_DATA_HASH_LENGTH, EInvalidDataHash);

    let timestamp = clock.timestamp_ms();

    // Validate expiry is in the future if provided
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
    };

    event::emit(AttestationCreated {
        attestation_id,
        schema_id,
        attester,
        recipient,
        walrus_blob_id,
        expires_at,
        timestamp,
    });

    transfer::transfer(attestation, recipient);

    // Register attester for revoke_by_id (doesn't need the owned Attestation object)
    revocation_registry.attester_registry.add(attestation_id, attester);
}

/// Revoke an attestation. Only the original attester can revoke.
/// Checks the Attestation object to verify attester, then writes
/// to the RevocationRegistry.
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

    event::emit(AttestationRevoked {
        attestation_id,
        attester: attestation.attester,
        reason: revocation_registry.revocations.borrow(attestation_id).reason,
        timestamp,
    });
}

/// Revoke by attestation ID without needing the owned Attestation object.
/// Uses the attester_registry to verify the caller is the original attester.
public entry fun revoke_by_id(
    revocation_registry: &mut RevocationRegistry,
    attestation_id: ID,
    reason: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(revocation_registry.attester_registry.contains(attestation_id), ESchemaNotFound);
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

    event::emit(AttestationRevoked {
        attestation_id,
        attester,
        reason: revocation_registry.revocations.borrow(attestation_id).reason,
        timestamp,
    });
}

// ── Public Read Functions ─────────────────────────────────

/// Verify an attestation is valid (not revoked, not expired).
/// Returns true if valid. Pure read-only function.
public fun verify(
    revocation_registry: &RevocationRegistry,
    attestation: &Attestation,
    clock: &Clock,
): bool {
    let attestation_id = object::uid_to_inner(&attestation.id);

    // Check revocation
    if (revocation_registry.revocations.contains(attestation_id)) {
        return false
    };

    // Check expiry
    if (attestation.expires_at.is_some()) {
        let expiry = *attestation.expires_at.borrow();
        if (clock.timestamp_ms() >= expiry) {
            return false
        };
    };

    true
}

/// Check if a specific attestation ID has been revoked.
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

// ── Test Helpers ──────────────────────────────────────────

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
