import { useCallback, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import { useLocation } from "@tanstack/react-router";
import { useAuth } from "./auth";
import { createScreenHistory, screenHistoryKey, type ScreenValue } from "./screen-history";
const screenHistory = createScreenHistory({
  getItem: (key) => window.sessionStorage.getItem(key),
  setItem: (key, value) => window.sessionStorage.setItem(key, value),
});
export function useScreenEntryKey() {
  const location = useLocation();
  const { user } = useAuth();
  return screenHistoryKey(
    user?.id,
    location.pathname,
    location.state.__TSR_key ?? location.state.key ?? location.href,
  );
}
/** Restore the exact history entry, not the last-used state of the whole route. */
export function useRememberedState<T extends ScreenValue>(
  field: string,
  initial: T,
  validate?: (value: ScreenValue) => boolean,
): [T, Dispatch<SetStateAction<T>>] {
  const key = useScreenEntryKey();
  const value = useSyncExternalStore(
    screenHistory.subscribe,
    () => screenHistory.get(key, field, initial, validate),
    () => initial,
  );
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      const current = screenHistory.get(key, field, initial, validate);
      screenHistory.set(key, field, typeof next === "function" ? next(current) : next);
    },
    [key, field, initial, validate],
  );
  return [value, setValue];
}
