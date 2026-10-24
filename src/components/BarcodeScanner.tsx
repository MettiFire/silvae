import { UiText, UiElement } from "@/lib/ui-language-context";
import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import type { IScannerControls } from "@zxing/browser";

/**
 * Fullscreen camera overlay that reads EAN-13 / ISBN barcodes.
 * ZXing is loaded lazily so it never enters the SSR bundle.
 */
export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let controls: IScannerControls | undefined;
    let cancelled = false;

    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all(
          [import("@zxing/browser"), import("@zxing/library")],
        );
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
        ]);
        const reader = new BrowserMultiFormatReader(hints);
        if (cancelled || !videoRef.current) return;
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (result) {
            const text = result.getText().replace(/[^0-9Xx]/g, "");
            if (text.length >= 8) {
              controls?.stop();
              onDetected(text);
            }
          }
        });
      } catch {
        if (!cancelled)
          setError("Impossibile accedere alla fotocamera. Controlla i permessi del browser.");
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 p-4 backdrop-blur">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-4 shadow-paper">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Camera className="h-5 w-5 text-primary" />
            <UiText text=" Scansiona il codice a barre" />
          </h2>
          <UiElement
            as="button"
            type="button"
            onClick={onClose}
            aria-label="Chiudi scanner"
            className="rounded-lg p-1 hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </UiElement>
        </div>
        {error ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{error}</p>
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="aspect-[3/4] w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-x-6 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-primary/80" />
          </div>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          <UiText text="Inquadra l'ISBN sul retro del libro: la ricerca parte da sola." />
        </p>
      </div>
    </div>
  );
}
