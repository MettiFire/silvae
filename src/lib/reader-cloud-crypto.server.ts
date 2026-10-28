import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";

export function sealReaderState(
  state: unknown,
  owner: string,
  key: string,
  provider: "kindle" | "kobo",
) {
  if (!/^[a-f0-9]{64}$/i.test(key)) throw Error("Cifratura del lettore non configurata.");
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  cipher.setAAD(Buffer.from(`silvae-${provider}-v1:${owner}`));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(state), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}
export function openReaderState(
  ciphertext: string,
  owner: string,
  key: string,
  provider: "kindle" | "kobo",
): unknown {
  if (
    !/^[a-f0-9]{64}$/i.test(key) ||
    ciphertext.length > (provider === "kindle" ? 150000 : 1500000)
  )
    throw Error("Collegamento del lettore non leggibile.");
  const bytes = Buffer.from(ciphertext, "base64"),
    cipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "hex"), bytes.subarray(0, 12));
  cipher.setAAD(Buffer.from(`silvae-${provider}-v1:${owner}`));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString());
}
