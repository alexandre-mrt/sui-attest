# SuiAttest E2E Test Results

Run date: 2026-07-14T09:40:51.831Z
Network: testnet
Package: `0xad9694dd2e550d1d0323c020f476f68e634b9b251bde4f72dccc9c1221b0d86f`
Attester: `0x2165a0c35225a5c4688e62e53370c3389ac2e07a8c5339d6797bd2a481e7d4a7`
Recipient: `0xdc4301acebd0661eb0465a62f07371ddf4e02e12a2ee2073ed343584e62ba546`
SchemaRegistry: `0xee6f0b2a0ef8ce839b3690391718175ab64d3039c55fff6d1fa29e9be8073c4c`
RevocationRegistry: `0x72169c41300e41991ca88ef14ecaff3261ee4a510b9f9bff5702ccd9cbeae2d3`

## Steps

| # | Step | Status | Tx digest | Object |
|---|------|--------|-----------|--------|
| 1 | Create schema | PASS | `J7bRzJuuSWmm1qpVyu2Tm8bp21y6q9ZoNkBhMcdyeV8h` | `0x3323959ab41cd6603c51d4f7b9e23ffa439218b903a6ac356ec65a624a4b4e0d` |
| 2 | Issue attestation | PASS | `4SYByp5RLyUwFLteymf3FVi2ESJaHRb1KqdfcEMV6KSS` | `0xf38f4838a73cf6fa67a42c86bb14e74c93503ef45e51c954f31b56f455db0e96` |
| 3 | Verify (valid) | PASS | — | revoked=false |
| 4 | Revoke (revoke_by_id, recipient holds the object) | PASS | `9Mp8t1e5ji2HBTRXaX83z7wvaF1p17YEoGezgGjGgQq7` | — |
| 5 | Verify (revoked) | PASS | — | revoked=true |

5/5 steps passed.
