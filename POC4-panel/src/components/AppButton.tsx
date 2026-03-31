import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "success" | "danger";

type AppButtonProps = {
  children: ReactNode;
  variant?: Variant;
  isLoading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-400",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
};

export function AppButton({
  children,
  variant = "primary",
  isLoading = false,
  disabled,
  className = "",
  ...props
}: AppButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {isLoading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
      )}
      {children}
    </button>
  );
}