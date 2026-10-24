import { toast as original } from "sonner";
import { translateUi } from "./ui-translation";
const message = <T>(value: T) =>
  typeof value === "string"
    ? translateUi(
        value,
        typeof document !== "undefined" && document.documentElement.lang === "en" ? "en" : "it",
      )
    : value;
export const toast = {
  success: (...args: Parameters<typeof original.success>) =>
    original.success(message(args[0]), args[1]),
  error: (...args: Parameters<typeof original.error>) => original.error(message(args[0]), args[1]),
  warning: (...args: Parameters<typeof original.warning>) =>
    original.warning(message(args[0]), args[1]),
  info: (...args: Parameters<typeof original.info>) => original.info(message(args[0]), args[1]),
};
