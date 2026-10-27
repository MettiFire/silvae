import { useId, useRef } from "react";
import { Bold, Italic } from "lucide-react";
import { UiText } from "@/lib/ui-language-context";
import { useTranslate } from "@/lib/use-ui-language";
import { toggleFragmentEmphasis } from "@/lib/fragment-format";
import { FragmentText } from "./FragmentText";

export function FragmentTextEditor({
  value,
  onChange,
  label,
  maxLength,
  rows,
  disabled = false,
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  maxLength: number;
  rows: number;
  disabled?: boolean;
  required?: boolean;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const t = useTranslate();
  const format = (marker: "*" | "**") => {
    const field = input.current;
    if (!field || disabled) return;
    const next = toggleFragmentEmphasis(value, field.selectionStart, field.selectionEnd, marker);
    if (next.text.length > maxLength) return;
    onChange(next.text);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(next.start, next.end);
    });
  };
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <label htmlFor={id} className="min-w-0 text-sm">
          <UiText text={label} />
        </label>
        <div className="flex shrink-0 gap-1" role="group" aria-label={t("Formattazione del testo")}>
          <button
            type="button"
            disabled={disabled}
            title={t("Grassetto")}
            aria-label={t("Grassetto")}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => format("**")}
            className="flex size-11 items-center justify-center rounded-lg border disabled:opacity-40"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            disabled={disabled}
            title={t("Corsivo")}
            aria-label={t("Corsivo")}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => format("*")}
            className="flex size-11 items-center justify-center rounded-lg border disabled:opacity-40"
          >
            <Italic size={16} />
          </button>
        </div>
      </div>
      <textarea
        id={id}
        ref={input}
        aria-label={t(label)}
        required={required}
        maxLength={maxLength}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && ["b", "i"].includes(event.key.toLowerCase())) {
            event.preventDefault();
            format(event.key.toLowerCase() === "b" ? "**" : "*");
          }
        }}
        className="mt-1 w-full rounded-xl border bg-background p-3 leading-relaxed"
      />
      {value && (
        <details className="mt-2 rounded-lg bg-muted/40 p-3 text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            <UiText text="Anteprima" />
          </summary>
          <div className="mt-2 whitespace-pre-wrap break-words">
            <FragmentText text={value} />
          </div>
        </details>
      )}
    </div>
  );
}
