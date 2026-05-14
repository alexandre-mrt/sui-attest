import { Suspense } from 'react';
import { VerifyPanel } from './VerifyPanel';

export default function VerifyPage() {
  return (
    <div className="max-w-[640px] mx-auto px-6 py-16 animate-in">
      <div className="mb-8">
        <h1 className="text-[1.75rem] font-medium text-text-primary leading-[1.3]">
          Verify Attestation
        </h1>
        <p className="text-[0.875rem] text-text-secondary mt-1 leading-[1.6]">
          Check if an attestation is valid, revoked, or expired
        </p>
      </div>

      {/* Horizontal rule */}
      <div className="border-t border-border mb-8" />

      <Suspense>
        <VerifyPanel />
      </Suspense>
    </div>
  );
}
