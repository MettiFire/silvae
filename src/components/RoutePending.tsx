import { UiText } from "@/lib/ui-language-context";

export function RoutePending() {
  return (
    <div role="status" className="min-h-[50vh] pt-8">
      <div aria-hidden="true" className="h-10 w-3/4 max-w-md rounded bg-muted" />
      <div aria-hidden="true" className="mt-4 h-4 w-2/3 max-w-xs rounded bg-muted" />
      <span className="sr-only">
        <UiText text="Caricamento…" />
      </span>
    </div>
  );
}
