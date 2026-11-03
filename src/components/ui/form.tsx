import type { ReactNode } from "react";

export const inputClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 sm:text-sm shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15 aria-invalid:border-red-400 aria-invalid:focus:ring-red-500/15";

export const fullInputClass = `${inputClass} w-full`;

export const readonlyClass =
  "whitespace-pre-wrap break-words rounded-lg bg-readonly px-3 py-2.5 text-sm text-slate-700 ring-1 ring-inset ring-slate-200/70 min-h-10";

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const variants = {
    primary: "bg-primary text-white shadow-sm hover:bg-primary-hover",
    secondary: "bg-white text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50",
    danger: "bg-white text-red-600 shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-50",
  };
  return (
    <button
      className={`inline-flex min-w-28 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 sm:py-2 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
