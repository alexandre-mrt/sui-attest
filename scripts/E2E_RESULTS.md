# SuiAttest E2E Test Results

Run date: 2026-05-14T05:43:03.778Z
Network: testnet
Package (v3): `0x3827645d508fd7f1ebbddb0f7d7804e8b0b6658b7c8e729e4be90a69cefb21a1`
Attester: `0x2a3e5ad47e9e5837361280c9d0e2f156c4242d6b841d5378ccc975556bb949ad`
Recipient: `0x031b2c59ffa373b0e8ca8f973c58a5c62d8a9b49b5abec3bc8b7af00cb983880`
SchemaRegistry: `0x023e5da71a29d6cc94919453d7c3b3a269c1afb6fa2b0b8e8f51ac0a1bf4150f`
RevocationRegistry: `0x3b5f1504c8320c726a35ceb59974ca69ed675b51cb5dd9aac1c16703490c8ab7`

## Results

### Step 1: Create Schema — [PASS]
- **Tx digest**: `4fkWkhuaatpMtgJzzqJi37zGErpTpZJ2DQA2Ls9pLPQR`
- **Object ID**: `0x7aa597b41c5796b47c1cbca0fdea507aad759493bb1b0ef8c953647a3e8c6116`
- **Details**: SchemaOwnerCap/schema_id = 0x7aa597b41c5796b47c1cbca0fdea507aad759493bb1b0ef8c953647a3e8c6116

### Step 2: Issue Attestation — [FAIL]
- **Error**: Transaction resolution failed: MoveAbort in 1st command, abort code: 3, in '0x3827645d508fd7f1ebbddb0f7d7804e8b0b6658b7c8e729e4be90a69cefb21a1::attestation::attest' (instruction 31)

### Step 3: Verify (valid) — [FAIL]
- **Error**: Skipped — no attestation ID

### Step 4: Revoke — [FAIL]
- **Error**: Skipped — no attestation ID

### Step 5: Verify (revoked) — [FAIL]
- **Error**: Skipped — no attestation ID

## Summary
1/5 steps passed
