import { useEffect, useRef } from "react";
import { cn } from "./UI";

type OtpCodeInputProps = {
  value: string[];
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (value: string[]) => void;
  onComplete?: (code: string) => void;
  className?: string;
};

function sanitizeOtpText(value: string) {
  return value.replace(/\D/g, "");
}

export function OtpCodeInput({
  value,
  length = 6,
  disabled = false,
  autoFocus = false,
  onChange,
  onComplete,
  className,
}: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const focusInput = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, length - 1));
    const input = inputRefs.current[nextIndex];

    if (!input) {
      return;
    }

    input.focus();
    input.select();
  };

  const commitValue = (nextValue: string[]) => {
    onChange(nextValue);

    if (nextValue.every(Boolean) && onComplete) {
      onComplete(nextValue.join(""));
    }
  };

  const fillFromIndex = (index: number, rawValue: string) => {
    const digits = sanitizeOtpText(rawValue);

    if (!digits) {
      return;
    }

    const nextValue = [...value];
    let cursor = index;

    for (const digit of digits) {
      if (cursor >= length) {
        break;
      }

      nextValue[cursor] = digit;
      cursor += 1;
    }

    commitValue(nextValue);
    window.requestAnimationFrame(() => {
      focusInput(cursor >= length ? length - 1 : cursor);
    });
  };

  useEffect(() => {
    if (!autoFocus || disabled) {
      return;
    }

    window.requestAnimationFrame(() => {
      const firstEmptyIndex = value.findIndex((digit) => !digit);
      focusInput(firstEmptyIndex === -1 ? 0 : firstEmptyIndex);
    });
  }, [autoFocus, disabled]);

  return (
    <div className={cn("flex items-center justify-center gap-2", className)} dir="ltr">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(node) => {
            inputRefs.current[index] = node;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          enterKeyHint="done"
          disabled={disabled}
          value={value[index] ?? ""}
          aria-label={`OTP digit ${index + 1}`}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            const digits = sanitizeOtpText(event.target.value);

            if (!digits) {
              const nextValue = [...value];
              nextValue[index] = "";
              commitValue(nextValue);
              return;
            }

            fillFromIndex(index, digits);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              event.preventDefault();
              const nextValue = [...value];

              if (nextValue[index]) {
                nextValue[index] = "";
                commitValue(nextValue);
                return;
              }

              if (index > 0) {
                nextValue[index - 1] = "";
                commitValue(nextValue);
                window.requestAnimationFrame(() => {
                  focusInput(index - 1);
                });
              }

              return;
            }

            if (event.key === "Delete") {
              event.preventDefault();
              const nextValue = [...value];
              nextValue[index] = "";
              commitValue(nextValue);
              return;
            }

            if (event.key === "ArrowLeft") {
              event.preventDefault();
              focusInput(index - 1);
              return;
            }

            if (event.key === "ArrowRight") {
              event.preventDefault();
              focusInput(index + 1);
              return;
            }

            if (event.key.length === 1 && !/\d/.test(event.key)) {
              event.preventDefault();
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            fillFromIndex(index, event.clipboardData.getData("text"));
          }}
          className="h-12 w-12 rounded-[1rem] border border-slate-200 bg-white text-center text-base font-black text-slate-900 shadow-sm outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:opacity-60"
        />
      ))}
    </div>
  );
}
