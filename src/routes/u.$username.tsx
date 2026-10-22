import { createFileRoute } from "@tanstack/react-router";
import { ReaderProfile } from "@/components/ReaderProfile";
export const Route = createFileRoute("/u/$username")({
  head: () => ({
    meta: [
      { title: "Profilo lettore — Paginae" },
      { name: "description", content: "Letture, libri preferiti, liste e autori seguiti." },
    ],
  }),
  component: PublicProfile,
});
function PublicProfile() {
  const { username } = Route.useParams();
  return <ReaderProfile username={username} />;
}
