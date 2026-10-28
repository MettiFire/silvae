export type KoboBook = {
  id: string;
  title: string;
  authors: string[];
  percentage?: number;
  observed?: string;
  statusObserved?: string;
  status?: string;
};
export type KoboCloudStatus =
  | { phase: "disconnected" }
  | { phase: "unavailable"; message: string }
  | { phase: "pending"; code: string; url: string; expiresAt: number; nextPollAt: number }
  | {
      phase: "connected";
      connectedAt: number;
      books: KoboBook[];
      checkedAt?: number;
      partial: boolean;
    };
