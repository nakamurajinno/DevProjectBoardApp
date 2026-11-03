import type { ButtonHTMLAttributes, ComponentProps, ReactNode, SelectHTMLAttributes } from "react";

export const inputClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 sm:text-sm shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/15 aria-invalid:border-red-400 aria-invalid:focus:ring-red-500/15";

export const fullInputClass = `${inputClass} w-full`;

export const readonlyClass =
  "whitespace-pre-wrap break-words rounded-lg bg-readonly px-3 py-2.5 text-sm text-slate-700 ring-1 ring-inset ring-slate-200/70 min-h-10";

export type ButtonVariant = "primary" | "secondary" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white shadow-sm hover:bg-primary-hover",
  secondary: "bg-white text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50",
  danger: "bg-white text-red-600 shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-50",
};

// <Button> と同じ見た目のクラス。<Link> をボタンとして表示するときにも使う
export function buttonClass(variant: ButtonVariant = "primary", className = "") {
  return `inline-flex min-w-28 items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 sm:py-2 ${BUTTON_VARIANTS[variant]} ${className}`;
}

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
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export type SelectOption<T extends string> = { value: T; label: string };

// 選択肢の配列から <option> を並べるセレクトボックス
export function Select<T extends string>({
  options,
  className = "",
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  options: readonly SelectOption<T>[];
}) {
  return (
    <select className={`${inputClass} ${className}`} {...props}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// 工数・作業時間の入力欄 (単位 h を右に表示する)
// leading: 入力欄の左に添える表示 (詳細編集の実績工数など)
export function HoursInput({
  leading,
  ...props
}: Omit<ComponentProps<"input">, "type" | "className"> & {
  leading?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {leading}
      <input type="number" min={0} className={`${inputClass} w-24`} {...props} />
      <span className="text-slate-500">h</span>
    </div>
  );
}
