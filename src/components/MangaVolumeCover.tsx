import { useMangaVolumeCovers } from "@/lib/use-manga-volume-covers";
import { UiText, UiElement } from "@/lib/ui-language-context";
import { useState } from "react";
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
export function MangaVolumeGallery({ book }: { book: Book }) {
  const { data: covers = [], isFetching } = useMangaVolumeCovers(book);
  const [limit, setLimit] = useState(12);
  if (!covers.length)
    return isFetching ? (
      <p className="mt-4 text-xs text-muted-foreground" role="status">
        <UiText text="Caricamento copertine dei volumi…" />
      </p>
    ) : null;
  return (
    <section className="mt-6">
      <h2 className="font-display text-xl">
        <UiText text="Volumi della serie" />
      </h2>
      <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
        {covers.slice(0, limit).map((c) => (
          <figure key={c.volume}>
            <MangaVolumeCover volume={c.volume} url={c.url} />
            <figcaption className="mt-1 text-xs">
              <UiText text="Volume " />
              {c.volume}
            </figcaption>
          </figure>
        ))}
      </div>
      {covers.length > limit && (
        <button
          type="button"
          className="button-outline mt-4"
          onClick={() => setLimit((v) => v + 24)}
        >
          <UiText text="Mostra altri volumi" />
        </button>
      )}
    </section>
  );
}
