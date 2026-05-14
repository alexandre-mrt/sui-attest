import { Suspense } from 'react';
import { MyAttestationsPanel } from './MyAttestationsPanel';

export default function MyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">My Attestations</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Attestations you have received or issued
        </p>
      </div>
      <Suspense>
        <MyAttestationsPanel />
      </Suspense>
    </div>
  );
}
