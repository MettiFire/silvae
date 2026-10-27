export type KindleRegion = "it" | "com";
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
  | { phase: "connected"; region: KindleRegion; connectedAt: number; reading?: KindleReadingCheck };
