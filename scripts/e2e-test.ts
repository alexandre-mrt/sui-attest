/**
 * SuiAttest end-to-end test against Sui testnet.
 *
 * Exercises the full lifecycle on the deployed package:
 *   1. create_schema     — register a "KYC Verified" schema
 *   2. attest            — issue an attestation to a recipient address
 *   3. verify            — attestation is valid (not revoked, not expired)
 *   4. revoke_by_id      — attester revokes WITHOUT holding the owned object
 *   5. verify            — attestation now reads as revoked
 *
 * Usage:
 *   cd scripts && bun install
 *   SUI_PRIVATE_KEY=suiprivkey1... bun run e2e-test.ts
 *
 * The attester key must hold testnet SUI. The recipient is a freshly generated
 * address (it never needs gas — the attestation is transferred to it).
 */

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Transaction } from "@mysten/sui/transactions";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { writeFileSync } from "node:fs";

// ── Deployment (testnet, see DEPLOYED.md) ─────────────────────────────────

const PACKAGE_ID =
	"0xad9694dd2e550d1d0323c020f476f68e634b9b251bde4f72dccc9c1221b0d86f";
const SCHEMA_REGISTRY =
	"0xee6f0b2a0ef8ce839b3690391718175ab64d3039c55fff6d1fa29e9be8073c4c";
const REVOCATION_REGISTRY =
	"0x72169c41300e41991ca88ef14ecaff3261ee4a510b9f9bff5702ccd9cbeae2d3";
const CLOCK = "0x6";

// Shared objects must be referenced with an explicit initialSharedVersion when
// the transaction is built against the gRPC client (no object resolution there).
const REGISTRY_ISV = "938844788"; // both registries were shared in the publish tx
const CLOCK_ISV = "1";

const GAS_BUDGET = 50_000_000;
const RESULTS_PATH = new URL("./E2E_RESULTS.md", import.meta.url).pathname;

const grpc = new SuiGrpcClient({
	network: "testnet",
	baseUrl: "https://fullnode.testnet.sui.io:443",
});

// ── Helpers ───────────────────────────────────────────────────────────────

interface StepResult {
	step: number;
	name: string;
	status: "PASS" | "FAIL";
	txDigest?: string;
	objectId?: string;
	details?: string;
}

const schemaReg = (tx: Transaction, mutable = false) =>
	tx.sharedObjectRef({
		objectId: SCHEMA_REGISTRY,
		mutable,
		initialSharedVersion: REGISTRY_ISV,
	});

const revocationReg = (tx: Transaction, mutable = true) =>
	tx.sharedObjectRef({
		objectId: REVOCATION_REGISTRY,
		mutable,
		initialSharedVersion: REGISTRY_ISV,
	});

const clockRef = (tx: Transaction) =>
	tx.sharedObjectRef({
		objectId: CLOCK,
		mutable: false,
		initialSharedVersion: CLOCK_ISV,
	});

const encode = (s: string): number[] => Array.from(new TextEncoder().encode(s));

async function hashData(data: Record<string, unknown>): Promise<Uint8Array> {
	const json = JSON.stringify(data, Object.keys(data).sort());
	const buf = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(json),
	);
	return new Uint8Array(buf);
}

interface ExecResult {
	digest: string;
	events: Array<{ eventType: string; json: Record<string, unknown> }>;
}

async function execute(
	keypair: Ed25519Keypair,
	tx: Transaction,
): Promise<ExecResult> {
	const result = await grpc.signAndExecuteTransaction({
		signer: keypair,
		transaction: tx,
		include: { effects: true, events: true },
	});

	if (result.$kind !== "Transaction") {
		const failed = result.FailedTransaction;
		throw new Error(
			`transaction failed: ${JSON.stringify(failed?.status ?? "unknown")}`,
		);
	}

	const events = (result.Transaction.events ?? []).map((e) => ({
		eventType: e.eventType ?? "",
		json: (e.json ?? {}) as Record<string, unknown>,
	}));

	return { digest: result.Transaction.digest, events };
}

function eventField(
	events: ExecResult["events"],
	eventName: string,
	field: string,
): string {
	for (const evt of events) {
		if (evt.eventType.includes(eventName)) {
			const v = evt.json[field];
			if (typeof v === "string") return v;
		}
	}
	throw new Error(`${eventName}.${field} not found in transaction events`);
}

/** Polls the fullnode until an object is visible (fresh writes propagate with a lag). */
async function waitForObject(objectId: string): Promise<void> {
	for (let attempt = 0; attempt < 20; attempt++) {
		try {
			await grpc.getObject({ objectId });
			return;
		} catch {
			await Bun.sleep(1000);
		}
	}
	throw new Error(`object ${objectId} never became visible`);
}

/**
 * Reads is_revoked(registry, attestation_id) without submitting a transaction:
 * simulate the call and decode the bool returned by the Move function.
 */
async function isRevoked(
	sender: string,
	attestationId: string,
): Promise<boolean> {
	const tx = new Transaction();
	tx.setSender(sender);
	tx.moveCall({
		target: `${PACKAGE_ID}::attestation::is_revoked`,
		arguments: [revocationReg(tx, false), tx.pure.id(attestationId)],
	});

	const res = await grpc.simulateTransaction({
		transaction: tx,
		include: { commandResults: true },
	});

	if (res.$kind !== "Transaction") {
		throw new Error("is_revoked simulation failed");
	}

	const bcsBytes = res.commandResults?.[0]?.returnValues?.[0]?.bcs;
	if (!bcsBytes) throw new Error("is_revoked returned no value");
	return bcsBytes[0] === 1;
}

/**
 * Simulation may briefly read a pre-revocation version of the shared registry,
 * so poll until the expected state shows up (or give up and fail loudly).
 */
async function waitForRevocationState(
	sender: string,
	attestationId: string,
	expected: boolean,
): Promise<boolean> {
	for (let attempt = 0; attempt < 10; attempt++) {
		const revoked = await isRevoked(sender, attestationId);
		if (revoked === expected) return revoked;
		await Bun.sleep(2000);
	}
	return await isRevoked(sender, attestationId);
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	const privKey = process.env.SUI_PRIVATE_KEY;
	if (!privKey) {
		throw new Error(
			"SUI_PRIVATE_KEY is required (a testnet key with gas, e.g. `sui keytool export`)",
		);
	}

	const { secretKey } = decodeSuiPrivateKey(privKey);
	const attester = Ed25519Keypair.fromSecretKey(secretKey);
	const attesterAddress = attester.toSuiAddress();
	const recipient = Ed25519Keypair.generate().toSuiAddress();

	console.log(`Package:   ${PACKAGE_ID}`);
	console.log(`Attester:  ${attesterAddress}`);
	console.log(`Recipient: ${recipient}\n`);

	const results: StepResult[] = [];

	// 1. Create schema
	const txSchema = new Transaction();
	txSchema.setGasBudget(GAS_BUDGET);
	txSchema.moveCall({
		target: `${PACKAGE_ID}::schema::create_schema`,
		arguments: [
			schemaReg(txSchema, true),
			txSchema.pure.vector("u8", encode("KYC Verified")),
			txSchema.pure.vector("u8", encode("Identity check passed")),
			txSchema.pure.vector("vector<u8>", [encode("country"), encode("level")]),
			txSchema.pure.vector("vector<u8>", [encode("string"), encode("u8")]),
			txSchema.pure.vector("bool", [true, true]),
			txSchema.pure.option("u256", null),
			clockRef(txSchema),
		],
	});
	const r1 = await execute(attester, txSchema);
	const schemaId = eventField(r1.events, "SchemaCreated", "schema_id");
	console.log(`1. create_schema  OK  schema=${schemaId}  tx=${r1.digest}`);
	results.push({
		step: 1,
		name: "Create schema",
		status: "PASS",
		txDigest: r1.digest,
		objectId: schemaId,
	});

	// The fullnode can still serve a pre-schema version of the shared registry
	// right after create_schema is finalized, so poll until the schema object
	// is visible before attesting.
	await waitForObject(schemaId);

	// 2. Attest
	const dataHash = await hashData({ country: "CH", level: 3 });
	const txAttest = new Transaction();
	txAttest.setGasBudget(GAS_BUDGET);
	txAttest.moveCall({
		target: `${PACKAGE_ID}::attestation::attest`,
		arguments: [
			schemaReg(txAttest),
			revocationReg(txAttest),
			txAttest.pure.id(schemaId),
			txAttest.pure.address(recipient),
			txAttest.pure.vector("u8", Array.from(dataHash)),
			txAttest.pure.option("u256", null), // walrus_blob_id
			txAttest.pure.option("u64", null), // expires_at
			txAttest.pure.bool(false), // is_encrypted
			txAttest.pure.option("address", null), // seal_allowlist_id
			clockRef(txAttest),
		],
	});
	const r2 = await execute(attester, txAttest);
	const attestationId = eventField(
		r2.events,
		"AttestationCreated",
		"attestation_id",
	);
	console.log(`2. attest         OK  id=${attestationId}  tx=${r2.digest}`);
	results.push({
		step: 2,
		name: "Issue attestation",
		status: "PASS",
		txDigest: r2.digest,
		objectId: attestationId,
	});

	// 3. Verify (expect: not revoked)
	const revokedBefore = await isRevoked(attesterAddress, attestationId);
	if (revokedBefore) throw new Error("attestation is revoked before revocation");
	console.log("3. verify         OK  revoked=false");
	results.push({
		step: 3,
		name: "Verify (valid)",
		status: "PASS",
		details: "revoked=false",
	});

	// 4. Revoke by ID — the attester does NOT hold the Attestation object
	const txRevoke = new Transaction();
	txRevoke.setGasBudget(GAS_BUDGET);
	txRevoke.moveCall({
		target: `${PACKAGE_ID}::attestation::revoke_by_id`,
		arguments: [
			revocationReg(txRevoke),
			txRevoke.pure.id(attestationId),
			txRevoke.pure.vector("u8", encode("E2E test revocation")),
			clockRef(txRevoke),
		],
	});
	const r4 = await execute(attester, txRevoke);
	console.log(`4. revoke_by_id   OK  tx=${r4.digest}`);
	results.push({
		step: 4,
		name: "Revoke (revoke_by_id, recipient holds the object)",
		status: "PASS",
		txDigest: r4.digest,
	});

	// 5. Verify (expect: revoked)
	const revokedAfter = await waitForRevocationState(
		attesterAddress,
		attestationId,
		true,
	);
	if (!revokedAfter) throw new Error("attestation is not revoked after revoke");
	console.log("5. verify         OK  revoked=true");
	results.push({
		step: 5,
		name: "Verify (revoked)",
		status: "PASS",
		details: "revoked=true",
	});

	// Results file
	const lines = [
		"# SuiAttest E2E Test Results",
		"",
		`Run date: ${new Date().toISOString()}`,
		"Network: testnet",
		`Package: \`${PACKAGE_ID}\``,
		`Attester: \`${attesterAddress}\``,
		`Recipient: \`${recipient}\``,
		`SchemaRegistry: \`${SCHEMA_REGISTRY}\``,
		`RevocationRegistry: \`${REVOCATION_REGISTRY}\``,
		"",
		"## Steps",
		"",
		"| # | Step | Status | Tx digest | Object |",
		"|---|------|--------|-----------|--------|",
		...results.map(
			(r) =>
				`| ${r.step} | ${r.name} | ${r.status} | ${r.txDigest ? `\`${r.txDigest}\`` : "—"} | ${r.objectId ? `\`${r.objectId}\`` : (r.details ?? "—")} |`,
		),
		"",
		`${results.filter((r) => r.status === "PASS").length}/${results.length} steps passed.`,
		"",
	];
	writeFileSync(RESULTS_PATH, lines.join("\n"));
	console.log(`\nAll ${results.length} steps passed. Wrote ${RESULTS_PATH}`);
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
