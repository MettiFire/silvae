import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cover-repair-job")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleCoverRepairJob } = await import("@/lib/cover-repair-job.server");
        return handleCoverRepairJob(request);
      },
    },
  },
});
