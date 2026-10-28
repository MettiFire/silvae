import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/kobo-job")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleKoboJob } = await import("@/lib/kobo-job.server");
        return handleKoboJob(request);
      },
    },
  },
});
