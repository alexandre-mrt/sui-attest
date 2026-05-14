import { Suspense } from 'react';
import { MyAttestationsPanel } from './MyAttestationsPanel';

export default function MyPage() {
  return (
    <div className="max-w-[1120px] mx-auto px-6 py-16 animate-in">
      <div className="mb-8">
        <h1 className="text-[1.75rem] font-medium text-text-primary leading-[1.3]">
          My Attestations
        </h1>
        <p className="text-[0.875rem] text-text-secondary mt-1 leading-[1.6]">
          Attestations you have received or issued
        </p>
      </div>

      {/* Horizontal rule */}
      <div className="border-t border-border mb-8" />

      <Suspense>
        <MyAttestationsPanel />
      </Suspense>
    </div>
  );
}
