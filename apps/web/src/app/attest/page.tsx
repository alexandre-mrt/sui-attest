import { Suspense } from 'react';
import { AttestForm } from './AttestForm';

export default function AttestPage() {
  return (
    <div className="max-w-[640px] mx-auto px-6 py-16 stagger">
      <div className="mb-10">
        <h1 className="text-[1.75rem] font-medium text-text-primary leading-[1.3]">
          Issue Attestation
        </h1>
        <p className="text-[0.875rem] text-text-secondary mt-2 leading-relaxed">
          Create a verifiable on-chain credential for a recipient
        </p>
      </div>
      <hr className="border-border mb-10" />
      <Suspense>
        <AttestForm />
      </Suspense>
    </div>
  );
}
