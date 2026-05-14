import Link from 'next/link';
import { CreateSchemaForm } from './CreateSchemaForm';

export default function CreateSchemaPage() {
  return (
    <div className="max-w-[640px] mx-auto px-6 py-16 animate-in">
      <div className="mb-8">
        <h1 className="text-[1.75rem] font-medium text-text-primary leading-[1.3]">
          Create Schema
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Define the structure for a new attestation type.{' '}
          <Link
            href="/schemas"
            className="text-text-secondary hover:text-text-primary transition-colors duration-150 underline underline-offset-2"
          >
            Browse existing schemas
          </Link>
        </p>
      </div>
      <CreateSchemaForm />
    </div>
  );
}
