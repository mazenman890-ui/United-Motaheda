import {
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEventHandler,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "./UI";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder: string;
  lang: "ar" | "en";
  className?: string;
  inputClassName?: string;
  shellClassName?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  name?: string;
  autoFocus?: boolean;
  dir?: "rtl" | "ltr" | "auto";
  startIcon?: LucideIcon;
  endSlot?: ReactNode;
  suggestions?: ReactNode;
  onFocus?: InputHTMLAttributes<HTMLInputElement>["onFocus"];
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  wrapperProps?: HTMLAttributes<HTMLDivElement>;
};

export function SearchBar({
  value,
  onChange,
  onClear,
  placeholder,
  lang,
  className,
  inputClassName,
  shellClassName,
  inputRef,
  name = "search",
  autoFocus = false,
  dir,
  startIcon: StartIcon = Search,
  endSlot,
  suggestions,
  onFocus,
  onKeyDown,
  wrapperProps,
}: SearchBarProps) {
  const startPosition = lang === "ar" ? "right-4" : "left-4";
  const endPosition = lang === "ar" ? "left-3" : "right-3";
  const inputPadding = lang === "ar" ? "pr-11 pl-12 text-right" : "pl-11 pr-12 text-left";
  const inputDirection = dir ?? (lang === "ar" ? "rtl" : "ltr");

  return (
    <div
      {...wrapperProps}
      className={cn("relative w-full", className, wrapperProps?.className)}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[1.45rem] border border-slate-200/90 bg-white/94 shadow-[0_14px_30px_rgba(15,23,42,0.06)] transition-all",
          "focus-within:border-teal-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-500/10",
          shellClassName,
        )}
      >
        <StartIcon
          className={cn(
            "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400",
            startPosition,
          )}
        />
        <input
          ref={inputRef}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          dir={inputDirection}
          className={cn(
            "h-12 w-full bg-transparent px-4 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400",
            inputPadding,
            inputClassName,
          )}
        />
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => (onClear ? onClear() : onChange(""))}
            className={cn(
              "absolute top-1/2 z-[1] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 focus-visible:ring-offset-2",
              endPosition,
              endSlot && (lang === "ar" ? "left-11" : "right-11"),
            )}
            aria-label={lang === "ar" ? "مسح البحث" : "Clear search"}
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {endSlot ? (
          <div
            className={cn(
              "absolute top-1/2 z-[1] -translate-y-1/2",
              endPosition,
            )}
          >
            {endSlot}
          </div>
        ) : null}
      </div>
      {suggestions}
    </div>
  );
}
