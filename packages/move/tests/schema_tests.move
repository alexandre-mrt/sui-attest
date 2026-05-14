#[test_only]
module sui_attest::schema_tests;

use sui::clock;
use sui::test_scenario::{Self as ts, Scenario};
use sui::test_utils::assert_eq;
use sui_attest::schema::{Self, SchemaRegistry, SchemaOwnerCap};

// ── Test Addresses ────────────────────────────────────────
const CREATOR: address = @0xA1;
const OTHER: address = @0xB2;

// ── Helpers ───────────────────────────────────────────────

fun setup(): Scenario {
    let mut scenario = ts::begin(CREATOR);
    {
        // Trigger module init to create SchemaRegistry
        schema::init_for_testing(scenario.ctx());
    };
    scenario
}

fun default_field_names(): vector<vector<u8>> {
    vector[b"name", b"age"]
}

fun default_field_types(): vector<vector<u8>> {
    vector[b"string", b"u64"]
}

fun default_field_required(): vector<bool> {
    vector[true, false]
}

// ── Tests ─────────────────────────────────────────────────

#[test]
fun test_create_schema_happy_path() {
    let mut scenario = setup();

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<SchemaRegistry>(&scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        schema::create_schema(
            &mut registry,
            b"KYC Schema",
            b"Know Your Customer verification",
            default_field_names(),
            default_field_types(),
            default_field_required(),
            option::none(),
            &clock,
            scenario.ctx(),
        );

        assert_eq(schema::schema_count(&registry), 1);

        clock::destroy_for_testing(clock);
        ts::return_shared(registry);
    };

    // Verify SchemaOwnerCap was transferred to creator
    ts::next_tx(&mut scenario, CREATOR);
    {
        let cap = ts::take_from_sender<SchemaOwnerCap>(&scenario);
        let schema_id = schema::cap_schema_id(&cap);

        // Verify schema exists in registry
        let registry = ts::take_shared<SchemaRegistry>(&scenario);
        assert!(schema::schema_exists(&registry, schema_id), 0);

        ts::return_to_sender(&scenario, cap);
        ts::return_shared(registry);
    };

    ts::end(scenario);
}

#[test]
fun test_create_schema_with_walrus_blob_id() {
    let mut scenario = setup();

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<SchemaRegistry>(&scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        let blob_id: u256 = 0xdeadbeefcafe1234567890abcdef1234567890abcdef1234567890abcdef1234;

        schema::create_schema(
            &mut registry,
            b"Credential Schema",
            b"Credential with Walrus doc",
            vector[b"field1"],
            vector[b"string"],
            vector[true],
            option::some(blob_id),
            &clock,
            scenario.ctx(),
        );

        assert_eq(schema::schema_count(&registry), 1);

        clock::destroy_for_testing(clock);
        ts::return_shared(registry);
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let cap = ts::take_from_sender<SchemaOwnerCap>(&scenario);
        let schema_id = schema::cap_schema_id(&cap);

        let registry = ts::take_shared<SchemaRegistry>(&scenario);
        assert!(schema::schema_exists(&registry, schema_id), 0);

        let record = schema::borrow_schema(&registry, schema_id);
        assert!(option::is_some(schema::record_walrus_blob_id(record)), 0);

        ts::return_to_sender(&scenario, cap);
        ts::return_shared(registry);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = schema::EEmptyName)]
fun test_create_schema_empty_name_rejected() {
    let mut scenario = setup();

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<SchemaRegistry>(&scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        schema::create_schema(
            &mut registry,
            b"", // empty name — should abort
            b"Some description",
            default_field_names(),
            default_field_types(),
            default_field_required(),
            option::none(),
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_shared(registry);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = schema::EEmptyFields)]
fun test_create_schema_empty_fields_rejected() {
    let mut scenario = setup();

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<SchemaRegistry>(&scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        schema::create_schema(
            &mut registry,
            b"Valid Name",
            b"Some description",
            vector[], // empty fields — should abort
            vector[],
            vector[],
            option::none(),
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_shared(registry);
    };

    ts::end(scenario);
}

#[test]
fun test_schema_lookup_after_creation() {
    let mut scenario = setup();

    ts::next_tx(&mut scenario, CREATOR);
    {
        let mut registry = ts::take_shared<SchemaRegistry>(&scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        schema::create_schema(
            &mut registry,
            b"Lookup Test Schema",
            b"Testing schema lookup",
            vector[b"email"],
            vector[b"string"],
            vector[true],
            option::none(),
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_shared(registry);
    };

    ts::next_tx(&mut scenario, CREATOR);
    {
        let cap = ts::take_from_sender<SchemaOwnerCap>(&scenario);
        let schema_id = schema::cap_schema_id(&cap);

        let registry = ts::take_shared<SchemaRegistry>(&scenario);

        // Schema must exist
        assert!(schema::schema_exists(&registry, schema_id), 0);

        // Verify record data
        let record = schema::borrow_schema(&registry, schema_id);
        assert_eq(*schema::record_name(record), b"Lookup Test Schema");
        assert_eq(schema::record_creator(record), CREATOR);

        // Non-existent schema must not exist
        let fake_id = object::id_from_address(@0xdeadbeef);
        assert!(!schema::schema_exists(&registry, fake_id), 0);

        ts::return_to_sender(&scenario, cap);
        ts::return_shared(registry);
    };

    ts::end(scenario);
}
