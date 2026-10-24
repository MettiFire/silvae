import { UiText, UiElement } from "@/lib/ui-language-context";
import { useState } from "react";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { prepareProfileImage, uploadProfileImage } from "@/lib/profile-images";

export function ProfileImageUpload({
  kind,
  userId,
  value,
  onChange,
  disabled,
  onBusyChange,
}: {
  kind: "avatar" | "banner";
  userId: string;
  value: string;
  onChange: (url: string) => void;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File) {
    setError("");
    setUploading(true);
    onBusyChange(true);
    try {
      const blob = await prepareProfileImage(file, kind);
      const url = await uploadProfileImage(supabase, userId, kind, blob);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Caricamento non riuscito.");
    } finally {
      setUploading(false);
      onBusyChange(false);
    }
  }
  const name = kind === "avatar" ? "Foto profilo" : "Banner";
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{name}</p>
      <div
        className={
          kind === "avatar"
            ? "h-24 w-24 overflow-hidden rounded-full bg-accent"
            : "aspect-[3/1] w-full overflow-hidden rounded-lg bg-accent"
        }
      >
        {value && (
          <UiElement
            as="img"
            key={value}
            src={value}
            alt={`Anteprima ${name.toLowerCase()}`}
            className="h-full w-full object-cover"
            width={kind === "avatar" ? 96 : 600}
            height={kind === "avatar" ? 96 : 200}
            decoding="async"
            onError={() => setError("L’immagine non è raggiungibile. Prova a caricarla di nuovo.")}
            referrerPolicy="no-referrer"
          />
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <label
          className={`button-outline cursor-pointer ${disabled || uploading ? "pointer-events-none opacity-50" : ""}`}
        >
          <Upload size={14} />
          <UiText text={uploading ? "Caricamento…" : `Carica ${name.toLowerCase()}`} />
          <UiElement
            as="input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label={`Carica ${name.toLowerCase()}`}
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </label>
        {value && (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => onChange("")}
            className="button-outline"
          >
            <X size={14} />
            <UiText text="Rimuovi" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        <UiText text="Immagine pubblica. JPG, PNG o WebP, massimo 8 MB. Salva il profilo per applicarla." />
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
