import { Suspense } from 'react';
import { VerifyPanel } from './VerifyPanel';

export default function VerifyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Verify Attestation</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Check if an attestation is valid, revoked, or expired
        </p>
      </div>
      <Suspense>
        <VerifyPanel />
      </Suspense>
    </div>
  );
}
