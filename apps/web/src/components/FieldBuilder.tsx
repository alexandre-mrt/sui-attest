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
        <p className="text-sm italic text-text-tertiary">No fields yet. Add at least one.</p>
      )}

      {fields.map((field, index) => (
        <div
          key={index}
          className="flex items-center gap-2 rounded-lg border border-border bg-bg-surface p-3"
        >
          <input
            type="text"
            placeholder="field_name"
            value={field.name}
            onChange={(e) => updateField(index, { name: e.target.value })}
            className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-bg-input px-3 font-mono text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />

          <select
            value={field.fieldType}
            onChange={(e) => updateField(index, { fieldType: e.target.value as FieldType })}
            className="h-10 rounded-lg border border-border bg-bg-input px-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            {FIELD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <label className="flex cursor-pointer items-center gap-1.5 text-[13px] font-medium uppercase tracking-wider text-text-secondary">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => updateField(index, { required: e.target.checked })}
              className="rounded border-border bg-bg-input text-accent focus:ring-accent focus:ring-offset-bg-root"
            />
            Required
          </label>

          <button
            type="button"
            onClick={() => removeField(index)}
            className="p-1 text-text-secondary transition-colors hover:text-revoked"
            aria-label="Remove field"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      {fields.length < MAX_FIELDS && (
        <button
          type="button"
          onClick={addField}
          className="w-full rounded-lg border border-dashed border-border py-2.5 text-sm text-text-secondary transition-colors hover:border-border-hover hover:text-accent"
        >
          + Add field
        </button>
      )}
    </div>
  );
}
