import { useEffect } from "react";
import { useTheme } from "@/lib/theme";

export function WebApp() {
  const { resolved } = useTheme();
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolved === "dark" ? "#1c1b1b" : "#f5f3eb");
  }, [resolved]);
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Installing is optional: a failed worker must not interrupt reading or sign-in.
      });
  }, []);
  return null;
}
