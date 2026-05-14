import { CreateSchemaForm } from './CreateSchemaForm';

export default function CreateSchemaPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">Create Schema</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Define the structure for a new attestation type
        </p>
      </div>
      <CreateSchemaForm />
    </div>
  );
}
