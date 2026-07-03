import { useEffect, useState } from "react";

function BackspaceIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-7-6 7-6z" />
      <path d="M13 9l5 6" />
      <path d="M18 9l-5 6" />
    </svg>
  );
}

export interface PinPadProps {
  length?: number;
  onComplete(value: string): void;
  onCancel?(): void;
  error?: boolean;
  disabled?: boolean;
}

const KEYS: (string | "back")[] = [
  "1", "2", "3",
  "4", "5", "6",
  "7", "8", "9",
  "",   "0", "back",
];

export function PinPad(props: PinPadProps) {
  const { length = 4, onComplete, onCancel, error = false, disabled = false } = props;
  const [value, setValue] = useState("");

  useEffect(() => {
    if (error) {
      setValue("");
    }
  }, [error]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (disabled) return;
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        press(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        back();
      } else if (e.key === "Escape" && onCancel) {
        e.preventDefault();
        onCancel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, disabled]);

  function press(d: string) {
    if (disabled) return;
    setValue((prev) => {
      if (prev.length >= length) return prev;
      const next = prev + d;
      if (next.length === length) {
        queueMicrotask(() => onComplete(next));
      }
      return next;
    });
  }

  function back() {
    if (disabled) return;
    setValue((prev) => prev.slice(0, -1));
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="flex items-center gap-4">
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          return (
            <div
              key={i}
              className={
                "h-4 w-4 rounded-full transition-colors duration-150 " +
                (filled
                  ? error
                    ? "bg-red-500"
                    : "bg-white"
                  : "bg-transparent border border-white/40")
              }
              aria-hidden="true"
            />
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-[280px]">
        {KEYS.map((k, i) => {
          if (k === "") {
            return <div key={i} aria-hidden="true" />;
          }
          if (k === "back") {
            return (
              <button
                key={i}
                type="button"
                onClick={back}
                disabled={disabled}
                className="aspect-square rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                aria-label="Delete"
              >
                <BackspaceIcon className="text-2xl" />
              </button>
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              disabled={disabled}
              className="aspect-square rounded-full flex items-center justify-center text-white text-2xl font-light hover:bg-white/10 active:bg-white/20 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label={`Digit ${k}`}
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
