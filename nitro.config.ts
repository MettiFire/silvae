import { defineConfig } from "nitro";

export default defineConfig({
  vercel: {
    config: {
      crons: [{ path: "/api/cover-repair-job", schedule: "20 4 * * *" }],
    },
  },
});
