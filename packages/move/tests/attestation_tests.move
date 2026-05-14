#[test_only]
module sui_attest::attestation_tests;

use sui::clock;
use sui::test_scenario::{Self as ts, Scenario};
use sui::test_utils::assert_eq;
use sui_attest::schema::{Self, SchemaRegistry};
use sui_attest::attestation::{Self, Attestation, RevocationRegistry};

// ── Test Addresses ────────────────────────────────────────
const ATTESTER: address = @0xA1;
const RECIPIENT: address = @0xB2;
const THIRD_PARTY: address = @0xC3;

// ── Helpers ───────────────────────────────────────────────

/// A synthetic SHA-256 hash (32 bytes) for testing.
fun test_data_hash(): vector<u8> {
    vector[
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
        0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
        0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
    ]
}

/// Create both shared registries and a test schema. Returns schema_id.
fun setup_with_schema(scenario: &mut Scenario): ID {
    // Init schema module
    {
        schema::init_for_testing(scenario.ctx());
    };
    ts::next_tx(scenario, ATTESTER);

    // Init attestation module
    {
        attestation::init_for_testing(scenario.ctx());
    };
    ts::next_tx(scenario, ATTESTER);

    // Create a schema
    let schema_id;
    {
        let mut schema_registry = ts::take_shared<SchemaRegistry>(scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        schema::create_schema(
            &mut schema_registry,
            b"Test Schema",
            b"A test schema",
            vector[b"field1"],
            vector[b"string"],
            vector[true],
            option::none(),
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_shared(schema_registry);
    };
    ts::next_tx(scenario, ATTESTER);

    // Get schema_id from SchemaOwnerCap
    {
        let cap = ts::take_from_sender<sui_attest::schema::SchemaOwnerCap>(scenario);
        schema_id = schema::cap_schema_id(&cap);
        ts::return_to_sender(scenario, cap);
    };
    ts::next_tx(scenario, ATTESTER);

    schema_id
}

// ── Tests ─────────────────────────────────────────────────

#[test]
fun test_attest_happy_path() {
    let mut scenario = ts::begin(ATTESTER);
    let schema_id = setup_with_schema(&mut scenario);

    ts::next_tx(&mut scenario, ATTESTER);
    {
        let schema_registry = ts::take_shared<SchemaRegistry>(&scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        attestation::attest(
            &schema_registry,
            schema_id,
            RECIPIENT,
            test_data_hash(),
            option::none(),
            option::none(),
            false,
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_shared(schema_registry);
    };

    // Verify Attestation was transferred to recipient
    ts::next_tx(&mut scenario, RECIPIENT);
    {
        let att = ts::take_from_sender<Attestation>(&scenario);
        assert_eq(attestation::attester(&att), ATTESTER);
        assert_eq(attestation::recipient(&att), RECIPIENT);
        assert_eq(attestation::schema_id(&att), schema_id);
        assert_eq(attestation::is_encrypted(&att), false);
        ts::return_to_sender(&scenario, att);
    };

    ts::end(scenario);
}

#[test]
fun test_revoke_attestation() {
    let mut scenario = ts::begin(ATTESTER);
    let schema_id = setup_with_schema(&mut scenario);

    // Issue attestation
    ts::next_tx(&mut scenario, ATTESTER);
    {
        let schema_registry = ts::take_shared<SchemaRegistry>(&scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        attestation::attest(
            &schema_registry,
            schema_id,
            RECIPIENT,
            test_data_hash(),
            option::none(),
            option::none(),
            false,
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_shared(schema_registry);
    };

    // Recipient shares attestation ref so attester can revoke
    // (In test_scenario, ATTESTER initiates the revoke tx, borrowing recipient's object)
    ts::next_tx(&mut scenario, RECIPIENT);
    let att_id;
    {
        let att = ts::take_from_sender<Attestation>(&scenario);
        att_id = object::id(&att);
        ts::return_to_sender(&scenario, att);
    };

    // Attester revokes using immutable ref
    ts::next_tx(&mut scenario, ATTESTER);
    {
        let mut rev_registry = ts::take_shared<RevocationRegistry>(&scenario);
        let att = ts::take_from_address<Attestation>(&scenario, RECIPIENT);
        let clock = clock::create_for_testing(scenario.ctx());

        attestation::revoke(
            &mut rev_registry,
            &att,
            b"test revocation reason",
            &clock,
            scenario.ctx(),
        );

        assert!(attestation::is_revoked(&rev_registry, att_id), 0);

        clock::destroy_for_testing(clock);
        ts::return_to_address(RECIPIENT, att);
        ts::return_shared(rev_registry);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = attestation::ENotAttester)]
fun test_unauthorized_revoke() {
    let mut scenario = ts::begin(ATTESTER);
    let schema_id = setup_with_schema(&mut scenario);

    // Issue attestation
    ts::next_tx(&mut scenario, ATTESTER);
    {
        let schema_registry = ts::take_shared<SchemaRegistry>(&scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        attestation::attest(
            &schema_registry,
            schema_id,
            RECIPIENT,
            test_data_hash(),
            option::none(),
            option::none(),
            false,
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_shared(schema_registry);
    };

    // Third party tries to revoke — should abort with ENotAttester
    ts::next_tx(&mut scenario, THIRD_PARTY);
    {
        let mut rev_registry = ts::take_shared<RevocationRegistry>(&scenario);
        let att = ts::take_from_address<Attestation>(&scenario, RECIPIENT);
        let clock = clock::create_for_testing(scenario.ctx());

        attestation::revoke(
            &mut rev_registry,
            &att,
            b"unauthorized revocation attempt",
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_to_address(RECIPIENT, att);
        ts::return_shared(rev_registry);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = attestation::EAlreadyRevoked)]
fun test_double_revoke() {
    let mut scenario = ts::begin(ATTESTER);
    let schema_id = setup_with_schema(&mut scenario);

    // Issue attestation
    ts::next_tx(&mut scenario, ATTESTER);
    {
        let schema_registry = ts::take_shared<SchemaRegistry>(&scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        attestation::attest(
            &schema_registry,
            schema_id,
            RECIPIENT,
            test_data_hash(),
            option::none(),
            option::none(),
            false,
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_shared(schema_registry);
    };

    // First revoke
    ts::next_tx(&mut scenario, ATTESTER);
    {
        let mut rev_registry = ts::take_shared<RevocationRegistry>(&scenario);
        let att = ts::take_from_address<Attestation>(&scenario, RECIPIENT);
        let clock = clock::create_for_testing(scenario.ctx());

        attestation::revoke(
            &mut rev_registry,
            &att,
            b"first revocation",
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_to_address(RECIPIENT, att);
        ts::return_shared(rev_registry);
    };

    // Second revoke — should abort with EAlreadyRevoked
    ts::next_tx(&mut scenario, ATTESTER);
    {
        let mut rev_registry = ts::take_shared<RevocationRegistry>(&scenario);
        let att = ts::take_from_address<Attestation>(&scenario, RECIPIENT);
        let clock = clock::create_for_testing(scenario.ctx());

        attestation::revoke(
            &mut rev_registry,
            &att,
            b"second revocation attempt",
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_to_address(RECIPIENT, att);
        ts::return_shared(rev_registry);
    };

    ts::end(scenario);
}

#[test]
fun test_verify_valid_attestation() {
    let mut scenario = ts::begin(ATTESTER);
    let schema_id = setup_with_schema(&mut scenario);

    ts::next_tx(&mut scenario, ATTESTER);
    {
        let schema_registry = ts::take_shared<SchemaRegistry>(&scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        attestation::attest(
            &schema_registry,
            schema_id,
            RECIPIENT,
            test_data_hash(),
            option::none(),
            option::none(), // no expiry
            false,
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_shared(schema_registry);
    };

    ts::next_tx(&mut scenario, RECIPIENT);
    {
        let rev_registry = ts::take_shared<RevocationRegistry>(&scenario);
        let att = ts::take_from_sender<Attestation>(&scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        let valid = attestation::verify(&rev_registry, &att, &clock);
        assert!(valid, 0);

        clock::destroy_for_testing(clock);
        ts::return_to_sender(&scenario, att);
        ts::return_shared(rev_registry);
    };

    ts::end(scenario);
}

#[test]
fun test_verify_revoked_attestation() {
    let mut scenario = ts::begin(ATTESTER);
    let schema_id = setup_with_schema(&mut scenario);

    ts::next_tx(&mut scenario, ATTESTER);
    {
        let schema_registry = ts::take_shared<SchemaRegistry>(&scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        attestation::attest(
            &schema_registry,
            schema_id,
            RECIPIENT,
            test_data_hash(),
            option::none(),
            option::none(),
            false,
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_shared(schema_registry);
    };

    // Revoke
    ts::next_tx(&mut scenario, ATTESTER);
    {
        let mut rev_registry = ts::take_shared<RevocationRegistry>(&scenario);
        let att = ts::take_from_address<Attestation>(&scenario, RECIPIENT);
        let clock = clock::create_for_testing(scenario.ctx());

        attestation::revoke(
            &mut rev_registry,
            &att,
            b"revoked for test",
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_to_address(RECIPIENT, att);
        ts::return_shared(rev_registry);
    };

    // Verify returns false
    ts::next_tx(&mut scenario, RECIPIENT);
    {
        let rev_registry = ts::take_shared<RevocationRegistry>(&scenario);
        let att = ts::take_from_sender<Attestation>(&scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        let valid = attestation::verify(&rev_registry, &att, &clock);
        assert!(!valid, 0);

        clock::destroy_for_testing(clock);
        ts::return_to_sender(&scenario, att);
        ts::return_shared(rev_registry);
    };

    ts::end(scenario);
}

#[test]
fun test_verify_expired_attestation() {
    let mut scenario = ts::begin(ATTESTER);
    let schema_id = setup_with_schema(&mut scenario);

    // Issue attestation with expiry in the future (relative to clock=0)
    ts::next_tx(&mut scenario, ATTESTER);
    {
        let schema_registry = ts::take_shared<SchemaRegistry>(&scenario);
        // Clock at time 0 by default in tests
        let clock = clock::create_for_testing(scenario.ctx());

        // expires_at = 1000 ms (> current timestamp 0)
        attestation::attest(
            &schema_registry,
            schema_id,
            RECIPIENT,
            test_data_hash(),
            option::none(),
            option::some(1000u64),
            false,
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_shared(schema_registry);
    };

    // Verify with a clock advanced past expiry
    ts::next_tx(&mut scenario, RECIPIENT);
    {
        let rev_registry = ts::take_shared<RevocationRegistry>(&scenario);
        let att = ts::take_from_sender<Attestation>(&scenario);

        // Advance clock past expiry
        let mut clock = clock::create_for_testing(scenario.ctx());
        clock::set_for_testing(&mut clock, 2000); // 2000ms > expires_at 1000ms

        let valid = attestation::verify(&rev_registry, &att, &clock);
        assert!(!valid, 0);

        clock::destroy_for_testing(clock);
        ts::return_to_sender(&scenario, att);
        ts::return_shared(rev_registry);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = attestation::ESelfAttestation)]
fun test_self_attestation_prevented() {
    let mut scenario = ts::begin(ATTESTER);
    let schema_id = setup_with_schema(&mut scenario);

    ts::next_tx(&mut scenario, ATTESTER);
    {
        let schema_registry = ts::take_shared<SchemaRegistry>(&scenario);
        let clock = clock::create_for_testing(scenario.ctx());

        // Attester tries to attest to themselves — should abort
        attestation::attest(
            &schema_registry,
            schema_id,
            ATTESTER, // recipient == attester
            test_data_hash(),
            option::none(),
            option::none(),
            false,
            &clock,
            scenario.ctx(),
        );

        clock::destroy_for_testing(clock);
        ts::return_shared(schema_registry);
    };

    ts::end(scenario);
}
