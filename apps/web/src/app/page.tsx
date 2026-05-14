import Link from 'next/link';

const FEATURES = [
  {
    title: 'Issue Attestations',
    description: 'Create verifiable on-chain credentials following a typed schema.',
    href: '/attest',
    cta: 'Issue attestation',
  },
  {
    title: 'Browse Schemas',
    description: 'Discover existing attestation schemas or define your own.',
    href: '/schemas',
    cta: 'Browse schemas',
  },
  {
    title: 'Verify Credentials',
    description: 'Instantly verify any attestation — check revocation and expiry status.',
    href: '/verify',
    cta: 'Verify',
  },
] as const;

const STATS = [
  { label: 'On-chain', value: 'Testnet' },
  { label: 'Network', value: 'Sui' },
  { label: 'License', value: 'Open Source' },
] as const;

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-400 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
          </span>
          Live on Sui Testnet
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-zinc-50 mb-6">
          On-chain attestations
          <br />
          <span className="text-blue-400">for Sui</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg text-zinc-400 mb-10 leading-relaxed">
          SuiAttest is infrastructure for issuing, verifying, and revoking verifiable
          credentials on Sui. Think EAS, built for the Sui ecosystem.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/schemas/create"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Create a schema
          </Link>
          <Link
            href="/explorer"
            className="rounded-lg border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
          >
            Browse attestations
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-zinc-800 py-8 mb-20">
        <dl className="flex flex-wrap items-center justify-center gap-12">
          {STATS.map(({ label, value }) => (
            <div key={label} className="text-center">
              <dt className="text-sm text-zinc-500">{label}</dt>
              <dd className="text-xl font-semibold text-zinc-100 mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Features */}
      <section className="pb-24">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-8 text-center">
          What you can do
        </h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {FEATURES.map(({ title, description, href, cta }) => (
            <div
              key={title}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col"
            >
              <h3 className="text-base font-semibold text-zinc-100 mb-2">{title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed flex-1">{description}</p>
              <Link
                href={href}
                className="mt-4 text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
              >
                {cta} &rarr;
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
