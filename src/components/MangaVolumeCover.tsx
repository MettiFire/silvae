import { useMangaVolumeCovers } from "@/lib/use-manga-volume-covers";
import { UiText, UiElement } from "@/lib/ui-language-context";
import { useEffect, useRef, useState } from "react";
import type { Book } from "@/lib/books";
export function MangaVolumeCover({ url, volume }: { url?: string | undefined; volume: number }) {
  const [failedUrl, setFailedUrl] = useState("");
  return (
    <span className="flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded border border-border bg-muted/40">
      {url && failedUrl !== url ? (
        <UiElement
          as="img"
          key={url}
          src={url}
          alt={`Copertina del volume ${volume}`}
          width={128}
          height={192}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(url)}
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="font-display text-2xl text-muted-foreground">{volume}</span>
      )}
    </span>
  );
}
export function MangaVolumeStrip({
  count,
  covers,
  read = [],
  onToggle,
  disabled = false,
  focusVolume = 1,
  focusTick = 0,
}: {
  count: number;
  covers: { volume: number; url: string }[];
  read?: number[];
  onToggle?: (n: number) => void;
  disabled?: boolean;
  focusVolume?: number;
  focusTick?: number;
}) {
  const [block, setBlock] = useState(0);
  const scroll = useRef<HTMLDivElement>(null);
  const safeBlock = Math.min(block, Math.max(0, Math.ceil(count / 25) - 1));
  useEffect(() => setBlock(Math.floor((focusVolume - 1) / 25)), [focusVolume, focusTick]);
  useEffect(() => {
    scroll.current?.scrollTo({ left: 0 });
  }, [safeBlock]);
  const byVolume = new Map(covers.map((c) => [c.volume, c.url]));
  const readSet = new Set(read);
  const start = safeBlock * 25 + 1,
    end = Math.min(count, start + 24);
  return (
    <div className="mt-4 min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        {count > 25 ? (
          <UiElement
            as="select"
            aria-label="Intervallo di volumi"
            value={safeBlock}
            onChange={(e) => setBlock(Number(e.target.value))}
            className="rounded border border-border bg-background py-1 pl-2 pr-7 text-xs"
          >
            {Array.from({ length: Math.ceil(count / 25) }, (_, i) => (
              <option key={i} value={i}>
                {i * 25 + 1}–{Math.min(count, (i + 1) * 25)}
              </option>
            ))}
          </UiElement>
        ) : (
          <span className="text-xs text-muted-foreground">
            <UiText text="Volumi della serie" />
          </span>
        )}
        <div className="flex gap-2">
          <UiElement
            as="button"
            type="button"
            aria-label="Scorri i volumi indietro"
            className="rounded border border-border px-3 py-1 text-sm"
            onClick={() => scroll.current?.scrollBy({ left: -260, behavior: "smooth" })}
          >
            ←
          </UiElement>
          <UiElement
            as="button"
            type="button"
            aria-label="Scorri i volumi avanti"
            className="rounded border border-border px-3 py-1 text-sm"
            onClick={() => scroll.current?.scrollBy({ left: 260, behavior: "smooth" })}
          >
            →
          </UiElement>
        </div>
      </div>
      <UiElement
        as="div"
        ref={scroll}
        aria-label="Volumi della serie"
        tabIndex={0}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-3 pt-1"
      >
        {Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i).map((n) =>
          onToggle ? (
            <UiElement
              as="button"
              key={n}
              type="button"
              aria-label={`Volume ${n}${readSet.has(n) ? ", letto" : ""}`}
              aria-pressed={readSet.has(n)}
              disabled={disabled}
              onClick={() => onToggle(n)}
              className={`w-20 shrink-0 snap-start rounded p-1 text-xs ${readSet.has(n) ? "bg-primary/10 ring-2 ring-inset ring-primary" : "hover:bg-accent"}`}
            >
              <MangaVolumeCover volume={n} url={byVolume.get(n)} />
              <span className="mt-1 block">
                {n}
                {readSet.has(n) ? " ✓" : ""}
              </span>
            </UiElement>
          ) : (
            <figure key={n} className="w-20 shrink-0 snap-start">
              <MangaVolumeCover volume={n} url={byVolume.get(n)} />
              <figcaption className="mt-1 text-xs">
                <UiText text="Volume " />
                {n}
              </figcaption>
            </figure>
          ),
        )}
      </UiElement>
    </div>
  );
}
export function MangaVolumeGallery({ book }: { book: Book }) {
  const { data: covers = [], isFetching } = useMangaVolumeCovers(book);
  const count = Math.max(book.manga?.totalVolumes ?? 0, ...covers.map((c) => c.volume));
  if (!count)
    return isFetching ? (
      <p className="mt-4 text-xs text-muted-foreground" role="status">
        <UiText text="Caricamento copertine dei volumi…" />
      </p>
    ) : null;
  return (
    <section className="mt-6 min-w-0">
      <h2 className="font-display text-xl">
        <UiText text="Volumi della serie" />
      </h2>
      <MangaVolumeStrip count={Math.min(2000, count)} covers={covers} />
    </section>
  );
}
