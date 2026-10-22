import { pageSeo } from "@/lib/site-seo";
import { createFileRoute } from "@tanstack/react-router";
import { ReaderProfile } from "@/components/ReaderProfile";
export const Route = createFileRoute("/u/$username")({
  head: ({ params }) =>
    pageSeo(
      `@${params.username} — Profilo su Silvae`,
      `Scopri letture, liste pubbliche, libri preferiti e autori seguiti da @${params.username}.`,
      `/u/${encodeURIComponent(params.username)}`,
      true,
    ),
  component: PublicProfile,
});
function PublicProfile() {
  const { username } = Route.useParams();
  return <ReaderProfile username={username} />;
}
