import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/kindle-job")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleKindleJob } = await import("@/lib/kindle-job.server");
        return handleKindleJob(request);
      },
    },
  },
});
