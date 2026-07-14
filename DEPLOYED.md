# Deployed contracts — Sui testnet

Current deployment. The SDK, the web app and `scripts/e2e-test.ts` all point at
these IDs.

| Object | ID |
|--------|----|
| Package | `0xad9694dd2e550d1d0323c020f476f68e634b9b251bde4f72dccc9c1221b0d86f` |
| SchemaRegistry (shared) | `0xee6f0b2a0ef8ce839b3690391718175ab64d3039c55fff6d1fa29e9be8073c4c` |
| RevocationRegistry (shared) | `0x72169c41300e41991ca88ef14ecaff3261ee4a510b9f9bff5702ccd9cbeae2d3` |
| UpgradeCap | `0x5b4a43985c18f66efede98603b802fc721397bc018d6e8a984c328317bdeacaf` |

- Publish transaction: `3ASLmrVhfEqmtwpJtBj9A2SLPHTGXf6fikPqLqoUPf55`
- Deployer: `0x2165a0c35225a5c4688e62e53370c3389ac2e07a8c5339d6797bd2a481e7d4a7`
- Initial shared version of both registries: `938844788` — needed when building
  transactions against `SuiGrpcClient`, which does not resolve shared objects
  for you.

Modules: `schema`, `attestation`, `seal_policy`.

## Earlier deployments

Three earlier testnet packages exist. They are superseded and nothing points at
them anymore:

| Version | Package | Superseded because |
|---------|---------|--------------------|
| v3 | `0x3827645d508fd7f1ebbddb0f7d7804e8b0b6658b7c8e729e4be90a69cefb21a1` | Predates the security fixes (revocation check in `seal_approve`, `seal_allowlist_id` binding), which change struct layout and signatures |
| v2 | `0xbe78d39e0d8bad38be37512b1d067b276b05113b3d236bef3faf04f272884f54` | Predates `revoke_by_id` and `attester_registry` |
| v1 | `0x4e1ff3e1a13fcfdc4e061cd17a2db6685e284182749e40a4920c4e1c8286ec18` | Predates `seal_policy` |

Every one of those steps changed a struct field or an entry-function signature,
which the `compatible` upgrade policy rejects, so each required a fresh publish
instead of an upgrade — and registry state does not carry across packages. That
is the practical cost of shipping shared objects without a `version: u64` field
and a `migrate()` path (finding M-8 in `AUDIT_REPORT.md`).
