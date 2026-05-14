module sui_attest::schema;

use sui::clock::Clock;
use sui::event;
use sui::table::{Self, Table};

// ── Constants ─────────────────────────────────────────────
const MAX_FIELDS: u64 = 32;
const MAX_NAME_LENGTH: u64 = 128;
const MAX_DESCRIPTION_LENGTH: u64 = 1024;

// ── Error Constants ───────────────────────────────────────
const ESchemaAlreadyExists: u64 = 0;
const ESchemaNotFound: u64 = 1;
const EEmptyName: u64 = 2;
const EEmptyFields: u64 = 3;
const ETooManyFields: u64 = 4;
const ENameTooLong: u64 = 5;
const EDescriptionTooLong: u64 = 6;
const EFieldVectorMismatch: u64 = 7;

// ── Types ─────────────────────────────────────────────────

/// Global registry. Shared object created in `init`.
public struct SchemaRegistry has key {
    id: UID,
    schemas: Table<ID, SchemaRecord>,
    schema_count: u64,
}

/// Stored inside the Table (not a top-level object).
public struct SchemaRecord has store {
    creator: address,
    name: vector<u8>,
    description: vector<u8>,
    fields: vector<FieldDefinition>,
    walrus_blob_id: Option<u256>,
    created_at: u64,
}

/// Field definition within a schema.
public struct FieldDefinition has store, copy, drop {
    name: vector<u8>,
    field_type: vector<u8>, // "string", "u64", "bool", "address", "bytes"
    required: bool,
}

/// Owned object returned to the schema creator as proof of authorship.
public struct SchemaOwnerCap has key, store {
    id: UID,
    schema_id: ID,
}

// ── Events ────────────────────────────────────────────────

public struct SchemaCreated has copy, drop {
    schema_id: ID,
    creator: address,
    name: vector<u8>,
    walrus_blob_id: Option<u256>,
    timestamp: u64,
}

// ── Module Initializer ────────────────────────────────────

/// Module initializer — creates the shared SchemaRegistry.
fun init(ctx: &mut TxContext) {
    let registry = SchemaRegistry {
        id: object::new(ctx),
        schemas: table::new(ctx),
        schema_count: 0,
    };
    transfer::share_object(registry);
}

// ── Entry Functions ───────────────────────────────────────

/// Create a new schema. Returns SchemaOwnerCap to the caller.
/// Fields are passed as parallel vectors and zipped into FieldDefinition.
public entry fun create_schema(
    registry: &mut SchemaRegistry,
    name: vector<u8>,
    description: vector<u8>,
    field_names: vector<vector<u8>>,
    field_types: vector<vector<u8>>,
    field_required: vector<bool>,
    walrus_blob_id: Option<u256>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(name.length() > 0, EEmptyName);
    assert!(name.length() <= MAX_NAME_LENGTH, ENameTooLong);
    assert!(description.length() <= MAX_DESCRIPTION_LENGTH, EDescriptionTooLong);
    assert!(field_names.length() > 0, EEmptyFields);
    assert!(field_names.length() <= MAX_FIELDS, ETooManyFields);
    assert!(field_names.length() == field_types.length(), EFieldVectorMismatch);
    assert!(field_names.length() == field_required.length(), EFieldVectorMismatch);

    let timestamp = clock.timestamp_ms();
    let creator = ctx.sender();

    // Build FieldDefinition vector from parallel inputs
    let mut fields = vector::empty<FieldDefinition>();
    let mut i = 0;
    while (i < field_names.length()) {
        let field = FieldDefinition {
            name: field_names[i],
            field_type: field_types[i],
            required: field_required[i],
        };
        fields.push_back(field);
        i = i + 1;
    };

    // Create the schema owner capability
    let cap_uid = object::new(ctx);
    let schema_id = object::uid_to_inner(&cap_uid);

    // Ensure no duplicate schema ID (extremely unlikely with UID, but defensive)
    assert!(!registry.schemas.contains(schema_id), ESchemaAlreadyExists);

    let record = SchemaRecord {
        creator,
        name,
        description,
        fields,
        walrus_blob_id,
        created_at: timestamp,
    };

    registry.schemas.add(schema_id, record);
    registry.schema_count = registry.schema_count + 1;

    let cap = SchemaOwnerCap {
        id: cap_uid,
        schema_id,
    };

    event::emit(SchemaCreated {
        schema_id,
        creator,
        name: registry.schemas.borrow(schema_id).name,
        walrus_blob_id: registry.schemas.borrow(schema_id).walrus_blob_id,
        timestamp,
    });

    transfer::transfer(cap, creator);
}

// ── Public Functions ──────────────────────────────────────

/// Read-only: borrow a schema record by ID.
public(package) fun borrow_schema(
    registry: &SchemaRegistry,
    schema_id: ID,
): &SchemaRecord {
    assert!(registry.schemas.contains(schema_id), ESchemaNotFound);
    registry.schemas.borrow(schema_id)
}

/// Check if a schema exists.
public fun schema_exists(registry: &SchemaRegistry, schema_id: ID): bool {
    registry.schemas.contains(schema_id)
}

// ── Accessor Functions ────────────────────────────────────

public fun record_creator(record: &SchemaRecord): address {
    record.creator
}

public fun record_name(record: &SchemaRecord): &vector<u8> {
    &record.name
}

public fun record_fields(record: &SchemaRecord): &vector<FieldDefinition> {
    &record.fields
}

public fun schema_count(registry: &SchemaRegistry): u64 {
    registry.schema_count
}

// ── Test Helpers ──────────────────────────────────────────

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

#[test_only]
public fun cap_schema_id(cap: &SchemaOwnerCap): ID {
    cap.schema_id
}

#[test_only]
public fun record_walrus_blob_id(record: &SchemaRecord): &Option<u256> {
    &record.walrus_blob_id
}
