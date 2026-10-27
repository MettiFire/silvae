import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FRAGMENT_PHOTO_BUCKET } from "@/lib/fragment-photos";
import { useAuth } from "@/lib/auth";
import { UiText } from "@/lib/ui-language-context";

/** Download with the current session; never turn a private photo into a public URL. */
export function FragmentImage({ path, alt }: { path: string; alt: string }) {
  const { user } = useAuth();
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const [photo, setPhoto] = useState<{
    path: string;
    viewer: string | undefined;
    url: string;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!visible) return;
    let disposed = false;
    let url: string | null = null;
    setFailed(false);
    void supabase.storage
      .from(FRAGMENT_PHOTO_BUCKET)
      .download(path)
      .then(({ data, error }) => {
        if (disposed) return;
        if (error || !data) {
          setFailed(true);
          return;
        }
        url = URL.createObjectURL(data);
        setPhoto({ path, viewer: user?.id, url });
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, user?.id, visible, attempt]);
  return (
    <div ref={host} className="mb-4 min-h-12">
      {photo?.path === path && photo.viewer === user?.id ? (
        <img
          src={photo.url}
          alt={alt}
          decoding="async"
          className="max-h-[36rem] w-full rounded-lg object-contain"
        />
      ) : (
        <div className="text-sm text-muted-foreground" role="status">
          <UiText text={failed ? "Foto temporaneamente non disponibile." : "Caricamento foto…"} />
          {failed && (
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="ml-2 underline"
            >
              <UiText text="Riprova" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
