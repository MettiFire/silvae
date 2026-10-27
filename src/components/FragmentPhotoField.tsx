import { useEffect, useRef, useState } from "react";
import ReactCrop, { type PercentCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { RotateCcw, RotateCw, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { validateProfileImage } from "@/lib/profile-images";
import { editPhoto, FULL_PHOTO } from "@/lib/photo-edit";
import { FRAGMENT_PHOTO_BUCKET } from "@/lib/fragment-photos";
import { fragmentError } from "@/lib/fragments";
import { toast } from "@/lib/localized-toast";
import { useTranslate } from "@/lib/use-ui-language";
import { UiText } from "@/lib/ui-language-context";
import { FragmentImage } from "./FragmentImage";

function usePhotoUrl(file: File | null) {
  const [value, setValue] = useState<{ file: File; url: string } | null>(null);
  useEffect(() => {
    if (!file) {
      setValue(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setValue({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return value?.file === file ? value?.url : undefined;
}

export function FragmentPhotoField({
  photo,
  path,
  busy,
  onChange,
  onRemove,
  onEditingChange,
}: {
  photo: File | null;
  path: string | null;
  busy: boolean;
  onChange: (file: File) => void;
  onRemove: () => void;
  onEditingChange: (editing: boolean) => void;
}) {
  const t = useTranslate();
  const [dragging, setDragging] = useState(false);
  const [source, setSource] = useState<File | null>(null);
  const [turns, setTurns] = useState(0);
  const [crop, setCrop] = useState<PercentCrop>({ ...FULL_PHOTO, unit: "%" });
  const [rendered, setRendered] = useState<{ source: File; turns: number; file: File } | null>(
    null,
  );
  const [working, setWorking] = useState(false);
  const [renderError, setRenderError] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const preview = usePhotoUrl(photo);
  const currentRender =
    rendered?.source === source && rendered.turns === turns ? rendered.file : null;
  const editPreview = usePhotoUrl(currentRender);
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    setRenderError(false);
    void editPhoto(source, turns)
      .then((file) => {
        if (!cancelled) setRendered({ source, turns, file });
      })
      .catch((error) => {
        if (!cancelled) {
          setRenderError(true);
          toast.error(fragmentError(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [source, turns]);
  function begin(file: File) {
    validateProfileImage(file);
    setSource(file);
    setTurns(0);
    setCrop({ ...FULL_PHOTO, unit: "%" });
    onEditingChange(true);
  }
  function accept(files: FileList | null) {
    if (!files?.length || busy || working || source) return;
    if (files.length !== 1) {
      toast.error(t("Scegli una sola foto alla volta."));
      return;
    }
    try {
      begin(files[0]!);
    } catch (error) {
      toast.error(fragmentError(error));
    }
  }
  async function openExisting() {
    if (photo) {
      begin(photo);
      return;
    }
    if (!path) return;
    setWorking(true);
    onEditingChange(true);
    try {
      const { data, error } = await supabase.storage.from(FRAGMENT_PHOTO_BUCKET).download(path);
      if (error || !data) throw Error("Foto temporaneamente non disponibile.");
      if (mounted.current) begin(new File([data], "frammento.webp", { type: data.type }));
    } catch (error) {
      if (mounted.current) {
        toast.error(fragmentError(error));
        onEditingChange(false);
      }
    } finally {
      if (mounted.current) setWorking(false);
    }
  }
  function close() {
    setSource(null);
    setRendered(null);
    onEditingChange(false);
  }
  async function apply() {
    if (!source) return;
    setWorking(true);
    try {
      const file = await editPhoto(source, turns, crop);
      if (mounted.current) {
        onChange(file);
        close();
      }
    } catch (error) {
      if (mounted.current) toast.error(fragmentError(error));
    } finally {
      if (mounted.current) setWorking(false);
    }
  }
  const disabled = busy || working || !!source;
  return (
    <div className="space-y-3 text-sm">
      <label
        className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-5 text-center transition-colors focus-within:ring-2 focus-within:ring-ring ${dragging ? "border-primary bg-accent" : "border-border bg-muted/20"} ${disabled ? "cursor-default opacity-60" : "hover:border-primary"}`}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!disabled) {
            event.dataTransfer.dropEffect = "copy";
            setDragging(true);
          }
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDragging(false);
          accept(event.dataTransfer.files);
        }}
      >
        <Upload size={20} aria-hidden="true" />
        <span className="font-medium">
          <UiText text="Trascina qui una foto o scegli un file" />
        </span>
        <span className="text-xs text-muted-foreground">
          <UiText text="JPG, PNG o WebP, fino a 8 MB. La foto segue la visibilità della tua raccolta." />
        </span>
        <input
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          aria-label={t("Foto del frammento")}
          onChange={(event) => {
            accept(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      {source ? (
        <div
          className="space-y-3 rounded-xl border border-border p-3"
          aria-label={t("Ritaglia e ruota")}
        >
          <p className="text-xs text-muted-foreground">
            <UiText text="Trascina i bordi per ritagliare. Puoi usare anche touch o tastiera." />
          </p>
          <div className="flex min-h-24 justify-center overflow-hidden rounded-lg bg-muted/30">
            {editPreview ? (
              <ReactCrop
                style={{ maxHeight: "20rem" }}
                ariaLabels={{
                  cropArea: t("Usa le frecce per spostare il ritaglio"),
                  nwDragHandle: t("Ridimensiona dall’angolo in alto a sinistra"),
                  nDragHandle: t("Ridimensiona dal bordo superiore"),
                  neDragHandle: t("Ridimensiona dall’angolo in alto a destra"),
                  eDragHandle: t("Ridimensiona dal bordo destro"),
                  seDragHandle: t("Ridimensiona dall’angolo in basso a destra"),
                  sDragHandle: t("Ridimensiona dal bordo inferiore"),
                  swDragHandle: t("Ridimensiona dall’angolo in basso a sinistra"),
                  wDragHandle: t("Ridimensiona dal bordo sinistro"),
                }}
                crop={crop}
                onChange={(_pixels, percent) => setCrop(percent)}
                keepSelection
                ruleOfThirds
                disabled={working}
              >
                <img
                  src={editPreview}
                  alt={t("Anteprima della foto")}
                  className="block max-h-80 max-w-full"
                  style={{ maxHeight: "20rem", width: "auto", maxWidth: "100%" }}
                />
              </ReactCrop>
            ) : (
              <p role="status" className="self-center p-4">
                <UiText
                  text={
                    renderError ? "Foto temporaneamente non disponibile." : "Preparazione foto…"
                  }
                />
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={working || !editPreview}
              aria-label={t("Ruota a sinistra")}
              onClick={() => {
                setTurns(turns - 1);
                setCrop({ ...FULL_PHOTO, unit: "%" });
              }}
              className="min-h-11 min-w-11 rounded-lg border p-2 disabled:opacity-40"
            >
              <RotateCcw size={18} />
            </button>
            <button
              type="button"
              disabled={working || !editPreview}
              aria-label={t("Ruota a destra")}
              onClick={() => {
                setTurns(turns + 1);
                setCrop({ ...FULL_PHOTO, unit: "%" });
              }}
              className="min-h-11 min-w-11 rounded-lg border p-2 disabled:opacity-40"
            >
              <RotateCw size={18} />
            </button>
            <button
              type="button"
              disabled={working}
              onClick={() => {
                setTurns(0);
                setCrop({ ...FULL_PHOTO, unit: "%" });
              }}
              className="rounded-lg border px-3 py-2"
            >
              <UiText text="Ripristina foto" />
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={working}
              onClick={close}
              className="rounded-lg border px-3 py-2"
            >
              <UiText text="Annulla" />
            </button>
            <button
              type="button"
              disabled={working || !editPreview || crop.width <= 0 || crop.height <= 0}
              onClick={() => void apply()}
              className="rounded-lg bg-primary px-3 py-2 text-primary-foreground disabled:opacity-40"
            >
              <UiText text={working ? "Preparazione foto…" : "Usa questa foto"} />
            </button>
          </div>
        </div>
      ) : (
        <>
          {preview ? (
            <img
              src={preview}
              alt={t("Anteprima della foto")}
              className="max-h-80 w-full rounded-lg object-contain"
            />
          ) : (
            path && <FragmentImage path={path} alt={t("Foto del frammento")} />
          )}
          {(photo || path) && (
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                disabled={busy || working}
                onClick={() => void openExisting()}
                className="min-h-11 underline"
              >
                <UiText text="Ritaglia e ruota" />
              </button>
              <button
                type="button"
                disabled={busy || working}
                onClick={onRemove}
                className="min-h-11 text-muted-foreground underline"
              >
                <UiText text="Rimuovi foto" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
