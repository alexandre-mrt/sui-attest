import Link from 'next/link';
import { AsciiHero } from '@/components/AsciiHero';

const STATS = [
  { value: '6', label: 'Schema types' },
  { value: '142', label: 'Attestations issued' },
  { value: '100%', label: 'On-chain' },
] as const;

const FEATURES = [
  {
    title: 'Schema Registry',
    description:
      'Define typed credential schemas that any issuer can adopt. Composable, versioned, permanent.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="14" height="14" rx="2" />
        <path d="M7 7h6M7 10h6M7 13h4" />
      </svg>
    ),
  },
  {
    title: 'Attestation Issuance',
    description:
      'Issue verifiable credentials tied to any Sui address. Structured data, on-chain proof.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 2v16M2 10h16" />
        <circle cx="10" cy="10" r="7" />
      </svg>
    ),
  },
  {
    title: 'On-chain Verification',
    description:
      'Instantly verify any attestation. Check revocation status, expiry, and issuer identity.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 10l3 3 5-6" />
        <circle cx="10" cy="10" r="7" />
      </svg>
    ),
  },
  {
    title: 'SEAL Encryption',
    description:
      'Encrypt sensitive credential data with threshold encryption. Reveal only to authorized parties.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="9" width="10" height="8" rx="1.5" />
        <path d="M7 9V6a3 3 0 0 1 6 0v3" />
      </svg>
    ),
  },
  {
    title: 'Walrus Storage',
    description:
      'Store large attestation payloads on Walrus. Decentralized, content-addressed, always available.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M8 7h4M8 10h4M8 13h2" />
      </svg>
    ),
  },
  {
    title: 'Revocation',
    description:
      'Revoke any credential instantly. Status updates propagate on-chain, verifiable by anyone.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7" />
        <path d="M13 7L7 13M7 7l6 6" />
      </svg>
    ),
  },
] as const;

export default function HomePage() {
  return (
    <div className="max-w-[1120px] mx-auto px-6">
      {/* Hero — ASCII particle art + CTA */}
      <section className="stagger pt-16 pb-16 text-center">
        <AsciiHero
          text="SUIATTEST"
          subtitle="Infrastructure for issuing, verifying, and revoking attestations on Sui."
        />
        <Link
          href="/attest"
          className="inline-flex items-center justify-center bg-accent text-text-inverse h-10 px-6 rounded-lg text-sm font-medium mt-6 hover:bg-accent-hover transition-colors duration-150"
        >
          Issue an attestation
        </Link>
      </section>

      {/* Stats Row */}
      <section className="border-y border-border py-8">
        <dl className="stagger max-w-3xl mx-auto grid grid-cols-3">
          {STATS.map(({ value, label }, i) => (
            <div
              key={label}
              className={`text-center ${i > 0 ? 'border-l border-border' : ''}`}
            >
              <dd className="font-display text-[2rem] tabular-nums text-text-primary">
                {value}
              </dd>
              <dt className="text-[13px] text-text-secondary mt-1">
                {label}
              </dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Features */}
      <section className="mt-16 pb-24">
        <div className="stagger max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          {FEATURES.map(({ title, description, icon }) => (
            <div key={title} className="flex gap-4">
              <div className="text-text-secondary mt-0.5 shrink-0">
                {icon}
              </div>
              <div>
                <h3 className="font-medium text-base text-text-primary">
                  {title}
                </h3>
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
