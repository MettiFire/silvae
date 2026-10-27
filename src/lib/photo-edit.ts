import { validateProfileImage } from "./profile-images.ts";

export type PhotoCrop = { x: number; y: number; width: number; height: number };
export const FULL_PHOTO: PhotoCrop = { x: 0, y: 0, width: 100, height: 100 };

/** Crop coordinates belong to the rotated image, independent of its displayed size. */
export function photoEditGeometry(width: number, height: number, turns: number, crop: PhotoCrop) {
  if (
    ![width, height, turns, crop.x, crop.y, crop.width, crop.height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    width * height > 40000000 ||
    !Number.isInteger(turns) ||
    crop.x < 0 ||
    crop.y < 0 ||
    crop.width <= 0 ||
    crop.height <= 0 ||
    crop.x + crop.width > 100.00001 ||
    crop.y + crop.height > 100.00001
  )
    throw Error("Ritaglio non valido. Seleziona un’area della foto.");
  const rotation = ((turns % 4) + 4) % 4;
  const rotatedWidth = rotation % 2 ? height : width;
  const rotatedHeight = rotation % 2 ? width : height;
  const cropWidth = (rotatedWidth * crop.width) / 100;
  const cropHeight = (rotatedHeight * crop.height) / 100;
  const scale = Math.min(1, 2400 / Math.max(cropWidth, cropHeight));
  return {
    rotation,
    rotatedWidth,
    rotatedHeight,
    x: (rotatedWidth * crop.x) / 100,
    y: (rotatedHeight * crop.y) / 100,
    cropWidth,
    cropHeight,
    outputWidth: Math.max(1, Math.round(cropWidth * scale)),
    outputHeight: Math.max(1, Math.round(cropHeight * scale)),
  };
}

/** Re-render from the original pixels every time; rotations do not accumulate quality loss. */
export async function editPhoto(
  file: File,
  turns: number,
  crop: PhotoCrop = FULL_PHOTO,
): Promise<File> {
  validateProfileImage(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw Error("Immagine non leggibile. Prova a esportarla come JPG, PNG o WebP.");
  }
  try {
    const g = photoEditGeometry(bitmap.width, bitmap.height, turns, crop);
    const canvas = document.createElement("canvas");
    canvas.width = g.outputWidth;
    canvas.height = g.outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Impossibile preparare l’immagine.");
    ctx.scale(g.outputWidth / g.cropWidth, g.outputHeight / g.cropHeight);
    ctx.translate(-g.x, -g.y);
    ctx.translate(g.rotatedWidth / 2, g.rotatedHeight / 2);
    ctx.rotate((g.rotation * Math.PI) / 2);
    ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    for (const quality of [0.9, 0.8, 0.65, 0.5]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", quality),
      );
      if (blob?.type === "image/webp" && blob.size > 0 && blob.size <= 2 * 1024 * 1024)
        return new File([blob], "frammento.webp", { type: "image/webp" });
    }
    throw Error("Non riesco a ridurre abbastanza questa immagine. Prova con una foto più piccola.");
  } finally {
    bitmap.close();
  }
}
