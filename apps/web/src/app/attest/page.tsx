import { Suspense } from 'react';
import { AttestForm } from './AttestForm';

export default function AttestPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Issue Attestation</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Create a verifiable on-chain credential for a recipient
        </p>
      </div>
      <Suspense>
        <AttestForm />
      </Suspense>
    </div>
  );
}
