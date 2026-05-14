# Deployed Contracts — Testnet

## v3 (current) — revoke_by_id + attester_registry

**Transaction**: `68mSd3WhvTHjLU7h5dYqx1rCoVFVA26gKyRuWpC2jxDG`

| Object | ID |
|--------|----|
| Package | `0x3827645d508fd7f1ebbddb0f7d7804e8b0b6658b7c8e729e4be90a69cefb21a1` |
| SchemaRegistry | `0x023e5da71a29d6cc94919453d7c3b3a269c1afb6fa2b0b8e8f51ac0a1bf4150f` |
| RevocationRegistry | `0x3b5f1504c8320c726a35ceb59974ca69ed675b51cb5dd9aac1c16703490c8ab7` |
| UpgradeCap | `0x2c56978fd3059599272702281b33df0b22fe5f4d0545c247d7b253f08750c4f4` |

Changes from v2:
- `RevocationRegistry` has new `attester_registry: Table<ID, address>` field
- `attest()` takes `revocation_registry: &mut RevocationRegistry` as 2nd param
- New `revoke_by_id()` entry function: revoke without owning the Attestation object

Note: fresh publish was required (breaking struct/signature changes, incompatible with `compatible` upgrade policy).

---

## v2 (legacy) — seal_policy

| Object | ID |
|--------|----|
| Package | `0xbe78d39e0d8bad38be37512b1d067b276b05113b3d236bef3faf04f272884f54` |
| SchemaRegistry | `0x1ba7a647bab32dab5cf26f7b5ebdf0c7b9f0fb328a62e224bba45ce0bf493286` |
| RevocationRegistry | `0x0b4d19c17ebd450f9209a665be589f0a171bbe8e4d2970c84678d9ea840d7624` |
| UpgradeCap | `0xcd51ee61f30587af89c8b54bd9f33822f2732bfbbf2a636cf958a0a58366fceb` |

---

## v1 (legacy)

| Object | ID |
|--------|----|
| Package | `0x4e1ff3e1a13fcfdc4e061cd17a2db6685e284182749e40a4920c4e1c8286ec18` |

---

**Deployer address**: `0x2a3e5ad47e9e5837361280c9d0e2f156c4242d6b841d5378ccc975556bb949ad`
