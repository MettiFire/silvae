import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendario letture — Paginae" },
      { name: "description", content: "Le tue letture completate mese per mese, in ordine cronologico." },
      { property: "og:title", content: "Calendario letture — Paginae" },
      { property: "og:description", content: "Le tue letture completate mese per mese." },
    ],
  }),
  component: CalendarPage,
});

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function CalendarPage() {
  const { user } = useAuth();
  const { data: items = [] } = useLibrary(user?.id);
  const year = new Date().getFullYear();
  const finished = items.filter((i) => i.finished_at && new Date(i.finished_at).getFullYear() === year);

  return (
    <AppShell>
      <PageHeader title={`Calendario ${year}`} subtitle={`${finished.length} libri completati quest'anno`} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MONTHS.map((m, idx) => {
          const monthBooks = finished.filter((i) => new Date(i.finished_at!).getMonth() === idx);
          return (
            <div key={m} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display font-semibold">{m}</h2>
                <span className="text-xs text-muted-foreground">{monthBooks.length}</span>
              </div>
              {monthBooks.length === 0 ? (
                <p className="text-xs text-muted-foreground">—</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {monthBooks.map((i) => (
                    <Link key={i.id} to="/book/$bookId" params={{ bookId: i.book_id }} className="w-10">
                      <img src={i.books?.cover_url ?? ""} alt={i.books?.title ?? ""} className="cover-frame" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
