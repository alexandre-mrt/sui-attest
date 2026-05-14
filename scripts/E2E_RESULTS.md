# SuiAttest E2E Test Results

Run date: 2026-05-14T05:33:59.876Z
Network: testnet
Attester: `0x2a3e5ad47e9e5837361280c9d0e2f156c4242d6b841d5378ccc975556bb949ad`
Recipient: `0xf01e38275546df48bc4632969d0efefc7df16a50d530978058d650151ccb67ab`
Package: `0xbe78d39e0d8bad38be37512b1d067b276b05113b3d236bef3faf04f272884f54`

## Results

### Step 1: Create Schema — [PASS]
- **Tx digest**: `CbfqKezgcSzhLRkDMaqzEqXm9cZuZZKpBNG9JNkudJ68`
- **Object ID**: `0x3c034bbe0de4e94d6c3a57054b5bcb27c7f1182f262b5f991ad4d61acac935fe`
- **Details**: SchemaOwnerCap/schema_id = 0x3c034bbe0de4e94d6c3a57054b5bcb27c7f1182f262b5f991ad4d61acac935fe

### Step 2: Issue Attestation — [FAIL]
- **Error**: Transaction resolution failed: MoveAbort in 1st command, abort code: 3, in '0xbe78d39e0d8bad38be37512b1d067b276b05113b3d236bef3faf04f272884f54::attestation::attest' (instruction 27)

### Step 3: Verify (valid) — [FAIL]
- **Error**: Skipped — no attestation ID available

### Step 4: Revoke — [FAIL]
- **Error**: Skipped — no attestation ID available

### Step 5: Verify (revoked) — [FAIL]
- **Error**: Skipped — no attestation ID available

## Summary
1/5 steps passed
