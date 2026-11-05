import type { ReactNode } from "react";

export function SelectOptions({
  options,
}: {
  options: Record<string, string>;
}) {
  return Object.entries(options).map(([value, label]) => (
    <option key={value} value={value}>
      {label}
    </option>
  ));
}

export function Field({
  id,
  label,
  children,
  help,
}: {
  id: string;
  label: string;
  children: ReactNode;
  help?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {help ? <p className="field-help">{help}</p> : null}
    </div>
  );
}
