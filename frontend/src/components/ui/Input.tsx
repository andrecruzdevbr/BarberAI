import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const inputClassName =
  "w-full min-h-11 rounded-xl border border-border bg-background/70 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition duration-150 focus:border-accent/60 focus:bg-background/90 focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60";

export const selectClassName = `${inputClassName} appearance-none`;

export const textareaClassName = `${inputClassName} min-h-[88px] resize-y`;

type FieldProps = {
  label: string;
  id: string;
  hint?: string;
  children: ReactNode;
};

export function Field({ label, id, hint, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-200">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return <input className={[inputClassName, className].filter(Boolean).join(" ")} {...props} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = "", children, ...props }: SelectProps) {
  return (
    <select className={[selectClassName, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </select>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = "", ...props }: TextareaProps) {
  return <textarea className={[textareaClassName, className].filter(Boolean).join(" ")} {...props} />;
}
