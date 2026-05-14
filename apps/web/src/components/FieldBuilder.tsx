'use client';

import { FIELD_TYPES, MAX_FIELDS } from '@/lib/constants';
import type { FieldDefinition } from '@/lib/types';
import type { FieldType } from '@/lib/constants';

interface FieldBuilderProps {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
}

const EMPTY_FIELD: FieldDefinition = { name: '', fieldType: 'string', required: true };

export function FieldBuilder({ fields, onChange }: FieldBuilderProps) {
  const addField = () => {
    if (fields.length >= MAX_FIELDS) return;
    onChange([...fields, { ...EMPTY_FIELD }]);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, update: Partial<FieldDefinition>) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...update } : f)));
  };

  return (
    <div className="space-y-2">
      {fields.length === 0 && (
        <p className="text-sm text-zinc-500 italic">No fields yet. Add at least one.</p>
      )}

      {fields.map((field, index) => (
        <div
          key={index}
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
        >
          <input
            type="text"
            placeholder="field_name"
            value={field.name}
            onChange={(e) => updateField(index, { name: e.target.value })}
            className="flex-1 min-w-0 rounded bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none font-mono"
          />

          <select
            value={field.fieldType}
            onChange={(e) => updateField(index, { fieldType: e.target.value as FieldType })}
            className="rounded bg-zinc-800 border border-zinc-700 px-2 py-1.5 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => updateField(index, { required: e.target.checked })}
              className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900"
            />
            Required
          </label>

          <button
            type="button"
            onClick={() => removeField(index)}
            className="text-zinc-500 hover:text-red-400 transition-colors p-1"
            aria-label="Remove field"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      {fields.length < MAX_FIELDS && (
        <button
          type="button"
          onClick={addField}
          className="w-full rounded-lg border border-dashed border-zinc-700 py-2.5 text-sm text-zinc-500 hover:border-blue-500/50 hover:text-blue-400 transition-colors"
        >
          + Add field
        </button>
      )}
    </div>
  );
}
