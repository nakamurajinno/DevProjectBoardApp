import type { ReactNode } from "react";

export const inputClass =
  "rounded-lg border-2 border-gray-900 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-invalid:border-red-600";

export const fullInputClass = `${inputClass} w-full`;

export const readonlyClass =
  "whitespace-pre-wrap break-words rounded-lg bg-readonly px-3 py-2.5 text-sm min-h-10";

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
      <label htmlFor={htmlFor} className="block text-sm font-bold">
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
    primary: "bg-primary text-white hover:bg-primary-hover",
    secondary: "bg-cancel text-gray-900 hover:bg-gray-300",
    danger: "bg-white text-red-600 border border-red-300 hover:bg-red-50",
  };
  return (
    <button
      className={`inline-flex min-w-28 items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
