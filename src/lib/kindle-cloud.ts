export type KindleRegion = "it" | "com";
export type KindleBook = { key: string; type: "PDOC" | "EBOK" };
export type KindleCatalogue = {
  items: (KindleBook & { title: string; authors: string[] })[];
  partial: boolean;
};
export type KindleBookReading = KindleReadingCheck &
  KindleBook & {
    position?: number;
    lastReadPosition?: number;
    contentVersion?: { guid?: string; acr?: string };
    nativeReading?: {
      position?: string;
      date?: string;
      guid?: string;
      acr?: string;
      status: number;
    };
    updatedAt?: number;
    percentage?: number;
    percentageSource?: "amazon" | "positions";
  };
export function validKindleBook(book: KindleBook | undefined): book is KindleBook {
  return (
    !!book &&
    ["PDOC", "EBOK"].includes(book.type) &&
    typeof book.key === "string" &&
    /^[A-Z0-9]{10,64}$/.test(book.key)
  );
}
export type KindleReadingCheck = {
  checkedAt: number;
  status: "available" | "blocked" | "empty" | "error";
  message: string;
};
export type KindleCloudStatus =
  | { phase: "disconnected" }
  | { phase: "unavailable"; message: string }
  | {
      phase: "pending";
      region: KindleRegion;
      publicCode: string;
      url: string;
      expiresAt: number;
      nextPollAt: number;
    }
  | {
      phase: "connected";
      region: KindleRegion;
      connectedAt: number;
      reading?: KindleReadingCheck;
      bookReading?: KindleBookReading;
      catalogue?: KindleCatalogue;
      libraryMessage?: string;
    };
