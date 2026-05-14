module sui_attest::schema;

use sui::clock::Clock;
use sui::event;
use sui::table::{Self, Table};

// ── Constants ─────────────────────────────────────────────
const MAX_FIELDS: u64 = 32;
const MAX_NAME_LENGTH: u64 = 128;
const MAX_DESCRIPTION_LENGTH: u64 = 1024;

// ── Error Constants (200-range namespace) ─────────────────
const ESchemaAlreadyExists: u64 = 200;
const ESchemaNotFound: u64 = 201;
const EEmptyName: u64 = 202;
const EEmptyFields: u64 = 203;
const ETooManyFields: u64 = 204;
const ENameTooLong: u64 = 205;
const EDescriptionTooLong: u64 = 206;
const EFieldVectorMismatch: u64 = 207;
const EWrongSchemaCap: u64 = 208;

// ── Types ─────────────────────────────────────────────────

public struct SchemaRegistry has key {
    id: UID,
    schemas: Table<ID, SchemaRecord>,
    schema_count: u64,
}

public struct SchemaRecord has store {
    creator: address,
    name: vector<u8>,
    description: vector<u8>,
    fields: vector<FieldDefinition>,
    walrus_blob_id: Option<u256>,
    created_at: u64,
}

public struct FieldDefinition has store, copy, drop {
    name: vector<u8>,
    field_type: vector<u8>,
    required: bool,
}

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

public struct SchemaDeleted has copy, drop {
    schema_id: ID,
    deleted_by: address,
    timestamp: u64,
}

// ── Module Initializer ────────────────────────────────────

fun init(ctx: &mut TxContext) {
    let registry = SchemaRegistry {
        id: object::new(ctx),
        schemas: table::new(ctx),
        schema_count: 0,
    };
    transfer::share_object(registry);
}

// ── Entry Functions ───────────────────────────────────────

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

    let cap_uid = object::new(ctx);
    let schema_id = object::uid_to_inner(&cap_uid);

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

public entry fun delete_schema(
    registry: &mut SchemaRegistry,
    cap: SchemaOwnerCap,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let SchemaOwnerCap { id, schema_id } = cap;
    object::delete(id);

    assert!(registry.schemas.contains(schema_id), ESchemaNotFound);

    let SchemaRecord {
        creator: _,
        name: _,
        description: _,
        fields: _,
        walrus_blob_id: _,
        created_at: _,
    } = registry.schemas.remove(schema_id);

    registry.schema_count = registry.schema_count - 1;

    event::emit(SchemaDeleted {
        schema_id,
        deleted_by: ctx.sender(),
        timestamp: clock.timestamp_ms(),
    });
}

// ── Public Functions ──────────────────────────────────────

public(package) fun borrow_schema(
    registry: &SchemaRegistry,
    schema_id: ID,
): &SchemaRecord {
    assert!(registry.schemas.contains(schema_id), ESchemaNotFound);
    registry.schemas.borrow(schema_id)
}

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

public fun cap_schema_id(cap: &SchemaOwnerCap): ID {
    cap.schema_id
}

public fun record_walrus_blob_id(record: &SchemaRecord): &Option<u256> {
    &record.walrus_blob_id
}

// ── Test Helpers ──────────────────────────────────────────

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}
