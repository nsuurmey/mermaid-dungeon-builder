import { useState } from 'react';
import { useDebouncedCallback } from './useDebouncedCallback';

// Autosaving form controls. Each keeps its own local state and persists via a
// debounced callback, so editing feels live but the API isn't hit per keystroke.
// Callers should give the enclosing form a stable `key` (e.g. the entity id) so
// switching entities remounts these with fresh initial values.

interface TextProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function AutoText({ label, value, onSave, placeholder }: TextProps) {
  const [local, setLocal] = useState(value);
  const save = useDebouncedCallback(onSave, 500);
  return (
    <label className="field">
      <span>{label}</span>
      <input
        value={local}
        placeholder={placeholder}
        onChange={(e) => {
          setLocal(e.target.value);
          save(e.target.value);
        }}
      />
    </label>
  );
}

export function AutoTextArea({ label, value, onSave, placeholder, rows = 3 }: TextProps) {
  const [local, setLocal] = useState(value);
  const save = useDebouncedCallback(onSave, 500);
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        value={local}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => {
          setLocal(e.target.value);
          save(e.target.value);
        }}
      />
    </label>
  );
}

interface NumberProps {
  label: string;
  value: number | null;
  onSave: (value: number | null) => void;
  allowNegative?: boolean;
}

export function AutoNumber({ label, value, onSave }: NumberProps) {
  const [local, setLocal] = useState(value === null ? '' : String(value));
  const save = useDebouncedCallback(onSave, 500);
  return (
    <label className="field narrow">
      <span>{label}</span>
      <input
        type="number"
        value={local}
        onChange={(e) => {
          const raw = e.target.value;
          setLocal(raw);
          if (raw.trim() === '') {
            save(null);
          } else {
            const n = Number(raw);
            if (Number.isInteger(n)) save(n);
          }
        }}
      />
    </label>
  );
}

interface SelectProps<T extends string> {
  label: string;
  value: T | '';
  options: readonly T[];
  onSave: (value: T | null) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export function AutoSelect<T extends string>({
  label,
  value,
  options,
  onSave,
  allowEmpty,
  emptyLabel = '—',
}: SelectProps<T>) {
  return (
    <label className="field narrow">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          onSave(v === '' ? null : (v as T));
        }}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
