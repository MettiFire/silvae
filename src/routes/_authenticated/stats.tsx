import { useTranslate } from "@/lib/use-ui-language";
import { UiText } from "@/lib/ui-language-context";
import { decodeMangaProgress } from "@/lib/manga-account";
import { MANGA_FIELD, isMangaId, readVolumes } from "@/lib/manga-model";
import { pageSeo } from "@/lib/site-seo";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, PageHeader } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { readingStatistics } from "@/lib/reading-statistics";
import { useLibrary } from "@/lib/library";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () =>
    pageSeo(
      "Statistiche di lettura — Silvae",
      "Esplora le tue statistiche: libri e pagine letti, generi, autori e ritmo di lettura nel tempo.",
      undefined,
      true,
    ),
  component: Stats,
});

function Stats() {
  const t = useTranslate();
  const { user } = useAuth();
  const { data: items = [], isLoading, isError } = useLibrary(user?.id);

  const mangaState = decodeMangaProgress(user?.user_metadata[MANGA_FIELD]);
  const mangaItems = items.filter((item) => isMangaId(item.book_id));
  const mangaVolumes = mangaItems.reduce(
    (sum, item) => sum + readVolumes(mangaState[item.book_id]).length,
    0,
  );
  const [year, setYear] = useState(new Date().getFullYear());
  const stats = useMemo(() => readingStatistics(items, year), [items, year]);

  if (isLoading || isError)
    return (
      <AppShell>
        <PageHeader title="Statistiche" subtitle="Il tuo ritmo di lettura" />
        <p role={isError ? "alert" : "status"} className="editorial-empty">
          <UiText
            text={
              isError
                ? "Le statistiche non sono disponibili. Ricarica la pagina per riprovare."
                : "Caricamento…"
            }
          />
        </p>
      </AppShell>
    );

  const colors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "var(--muted-foreground)",
  ];

  return (
    <AppShell>
      <PageHeader title="Statistiche" subtitle="I numeri delle tue letture" />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Libri letti" value={stats.read.length} />
        <Card label="Pagine dei libri letti" value={stats.totalPages} />
        <Card label="Tempo stimato" value={`${stats.hours} h`} hint="Stima a 40 pagine all’ora" />
        <Card label="Ritmo medio" value={stats.pace == null ? "—" : `${stats.pace} pag/g`} />
        <Card label="Serie manga in libreria" value={mangaItems.length} />
        <Card
          label="Volumi manga letti"
          value={mangaVolumes}
          hint="Totale delle serie in libreria; i volumi non sono contati come libri separati"
        />
        <Card label="Ultimi 7 giorni" value={stats.last7} />
        <Card label="Ultimi 30 giorni" value={stats.last30} />
        <Card label="Ultimi 90 giorni" value={stats.last90} />
        <Card
          label="Completamento"
          value={`${stats.completion}%`}
          hint={`${stats.read.length}/${stats.started} iniziati`}
        />
        <Card label="Autori letti" value={stats.authors} />
        <Card
          label="Voto medio assegnato"
          value={stats.avgRating ? `${stats.avgRating}/5` : "—"}
          hint={`${stats.rated} libri valutati`}
        />
        <Card
          label="Lunghezza media"
          value={stats.avgPages == null ? "—" : `${stats.avgPages} pag`}
        />
        <Card
          label="Durata media di lettura"
          value={stats.avgDays == null ? "—" : `${stats.avgDays} giorni`}
          hint="Solo letture con inizio e fine"
        />
        <Card label="In lettura" value={stats.reading} />
        <Card label="Da leggere" value={stats.waiting} />
        <Card label="Abbandonati" value={stats.abandoned} />
      </div>
      <p className="mb-6 text-xs text-muted-foreground">
        <UiText text="I conteggi annuali usano la data di fine lettura, comprese le date importate." />{" "}
        {stats.undated > 0
          ? `${stats.undated} libri letti senza una data valida non sono attribuiti a un anno.`
          : ""}{" "}
        <UiText text="Ogni libro conta una volta; le riletture senza uno storico delle date non vengono distribuite negli anni. Le pagine e il tempo stimato si basano sui libri completati con numero di pagine disponibile." />
      </p>
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-display font-semibold">
          <UiText text="Il tuo storico di lettura" />
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              <UiText text="Libri e pagine completati per anno" />
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2">
                  <UiText text="Anno" />
                </th>
                <th scope="col">
                  <UiText text="Libri letti" />
                </th>
                <th scope="col">
                  <UiText text="Pagine" />
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.byYear.map((row) => (
                <tr key={row.year} className="border-b border-border last:border-0">
                  <th scope="row" className="py-3 font-medium">
                    {row.year}
                  </th>
                  <td>{row.libri}</td>
                  <td>{row.pages.toLocaleString("it-IT")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mb-4 flex items-center gap-3">
        <label htmlFor="statistics-year" className="text-sm">
          <UiText text="Dettaglio mensile" />
        </label>
        <select
          id="statistics-year"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-border bg-background px-3 py-2"
        >
          {[...new Set([year, ...stats.years])]
            .sort((a, b) => b - a)
            .map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
        </select>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`Libri letti per mese · ${year}`}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                tickFormatter={(value: string) => t(value)}
                dataKey="month"
                stroke="var(--muted-foreground)"
                fontSize={12}
              />
              <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="libri" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Distribuzione per genere">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={stats.byGenre}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={90}
              >
                {stats.byGenre.map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Giorni più attivi">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="libri" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </AppShell>
  );
}

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-display text-2xl font-bold">
        <UiText text={value} />
      </p>
      <p className="text-xs text-muted-foreground">
        <UiText text={label} />
      </p>
      {hint && (
        <p className="text-[11px] text-muted-foreground/80">
          <UiText text={hint} />
        </p>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 font-display font-semibold">
        <UiText text={title} />
      </h2>
      {children}
    </div>
  );
}
