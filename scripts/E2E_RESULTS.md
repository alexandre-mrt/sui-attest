# SuiAttest E2E Test Results

Run date: 2026-05-14T05:49:12.545Z
Network: testnet
Package (v3): `0x3827645d508fd7f1ebbddb0f7d7804e8b0b6658b7c8e729e4be90a69cefb21a1`
Attester: `0x2a3e5ad47e9e5837361280c9d0e2f156c4242d6b841d5378ccc975556bb949ad`
Recipient: `0x031b2c59ffa373b0e8ca8f973c58a5c62d8a9b49b5abec3bc8b7af00cb983880`
SchemaRegistry: `0x023e5da71a29d6cc94919453d7c3b3a269c1afb6fa2b0b8e8f51ac0a1bf4150f`
RevocationRegistry: `0x3b5f1504c8320c726a35ceb59974ca69ed675b51cb5dd9aac1c16703490c8ab7`

## Results

### Step 1: Create Schema — [PASS]
- **Tx digest**: `CsUmcwoXAJ9Kex54ujCDdECXu4JWHQpnGHN1S2RDPzYQ`
- **Object ID**: `0x2eb44b3352cee9e1771627b28756fe6c00b3e737ec0a17ce2800b7680fabbb41`
- **Details**: SchemaOwnerCap/schema_id = 0x2eb44b3352cee9e1771627b28756fe6c00b3e737ec0a17ce2800b7680fabbb41

### Step 2: Issue Attestation — [PASS]
- **Tx digest**: `88nyjdQcf2Cw6A9nPiYPm3SkA8qGSpHDT8HSECiUGQw3`
- **Object ID**: `0x29a1f6212953823f8bb562ca6e7f097238d3b0149134da7489b49d0ddd11231a`
- **Details**: Data hash: 4fa2e6c91f5e06f7806a3a2cb12ba7fc83340e9eabb9c992cf4b29c26a548988

### Step 3: Verify (valid) — [PASS]
- **Object ID**: `0x29a1f6212953823f8bb562ca6e7f097238d3b0149134da7489b49d0ddd11231a`
- **Details**: valid=true, revoked=false, attester=0x2a3e5ad47e9e5837361280c9d0e2f156c4242d6b841d5378ccc975556bb949ad, recipient=0x031b2c59ffa373b0e8ca8f973c58a5c62d8a9b49b5abec3bc8b7af00cb983880

### Step 4: Revoke — [PASS]
- **Tx digest**: `2J3GFjeA9ZjPxAVKQMTtREnu359qGNk2b8tMgTxFmPtF`
- **Object ID**: `0x29a1f6212953823f8bb562ca6e7f097238d3b0149134da7489b49d0ddd11231a`
- **Details**: Reason: "E2E test revocation" (via revoke_by_id)

### Step 5: Verify (revoked) — [PASS]
- **Object ID**: `0x29a1f6212953823f8bb562ca6e7f097238d3b0149134da7489b49d0ddd11231a`
- **Details**: revoked=true

## Summary
5/5 steps passed
