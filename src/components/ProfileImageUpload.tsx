import { useState } from "react";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireFragmentUser } from "@/lib/fragments";

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
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 8 * 1024 * 1024
      )
        throw Error("Scegli una foto JPG, PNG o WebP fino a 8 MB.");
      await requireFragmentUser(supabase, userId);
      const bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 40000000) {
        bitmap.close();
        throw Error("Immagine troppo grande. Scegli una versione più piccola.");
      }
      const scale = Math.min(
        1,
        (kind === "avatar" ? 512 : 1600) / Math.max(bitmap.width, bitmap.height),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        bitmap.close();
        throw Error("Impossibile preparare l’immagine.");
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(Error("Immagine non leggibile."))),
          "image/webp",
          0.85,
        ),
      );
      const extension = blob.type === "image/webp" ? "webp" : "png";
      const path = `${userId}/${kind}-${crypto.randomUUID()}.${extension}`;
      const { error: storageError } = await supabase.storage
        .from("profile-images")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (storageError) throw Error("Caricamento non riuscito. Riprova tra poco.");
      onChange(supabase.storage.from("profile-images").getPublicUrl(path).data.publicUrl);
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
          <img
            key={value}
            src={value}
            alt={`Anteprima ${name.toLowerCase()}`}
            className="h-full w-full object-cover"
            width={kind === "avatar" ? 96 : 600}
            height={kind === "avatar" ? 96 : 200}
            decoding="async"
            referrerPolicy="no-referrer"
          />
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <label
          className={`button-outline cursor-pointer ${disabled || uploading ? "pointer-events-none opacity-50" : ""}`}
        >
          <Upload size={14} />
          {uploading ? "Caricamento…" : `Carica ${name.toLowerCase()}`}
          <input
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
            Rimuovi
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Immagine pubblica. JPG, PNG o WebP, massimo 8 MB. Salva il profilo per applicarla.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
