import { pageSeo } from "@/lib/site-seo";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
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
import { useLibrary } from "@/lib/library";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () =>
    pageSeo(
      "Statistiche di lettura — Paginae",
      "Esplora le tue statistiche: libri e pagine letti, generi, autori e ritmo di lettura nel tempo.",
      undefined,
      true,
    ),
  component: Stats,
});

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const DAYS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const PAGES_PER_HOUR = 40;

function Stats() {
  const { user } = useAuth();
  const { data: items = [], isLoading, isError } = useLibrary(user?.id);

  const stats = useMemo(() => {
    const read = items.filter((i) => i.status === "read");
    const pagesOf = (i: (typeof items)[number]) => i.total_pages ?? i.books?.page_count ?? 0;
    const totalPages =
      read.reduce((s, i) => s + pagesOf(i) * (1 + i.reread_count), 0) +
      items.filter((i) => i.status === "reading").reduce((s, i) => s + i.current_page, 0);

    const inLastDays = (days: number) =>
      read.filter(
        (i) =>
          i.finished_at &&
          Date.now() - new Date(i.finished_at).getTime() >= 0 &&
          Date.now() - new Date(i.finished_at).getTime() < days * 864e5,
      );

    const byMonth = MONTHS.map((m, idx) => ({
      month: m,
      libri: read.filter(
        (i) =>
          i.finished_at &&
          new Date(i.finished_at).getFullYear() === new Date().getFullYear() &&
          new Date(i.finished_at).getMonth() === idx,
      ).length,
    }));

    const genreCounts = new Map<string, number>();
    read.forEach((i) =>
      (i.books?.categories ?? []).forEach((c) => genreCounts.set(c, (genreCounts.get(c) ?? 0) + 1)),
    );
    const byGenre = [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));

    const byDay = DAYS.map((d, idx) => ({
      day: d,
      libri: read.filter((i) => i.finished_at && new Date(i.finished_at).getDay() === idx).length,
    }));

    const started = items.filter((i) => i.status !== "to_read").length;
    const durations = read
      .filter((i) => i.started_at && i.finished_at)
      .map((i) => (new Date(i.finished_at!).getTime() - new Date(i.started_at!).getTime()) / 864e5)
      .filter((days) => days >= 0);
    const avgDays = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const avgPages = read.length ? read.reduce((s, i) => s + pagesOf(i), 0) / read.length : 0;

    return {
      read,
      totalPages,
      last7: inLastDays(7).length,
      last30: inLastDays(30).length,
      last90: inLastDays(90).length,
      byMonth,
      byGenre,
      byDay,
      started,
      completion: started ? Math.round((read.length / started) * 100) : 0,
      pace: avgDays > 0 ? Math.round(avgPages / Math.max(1, avgDays)) : 0,
      hours: Math.round(totalPages / PAGES_PER_HOUR),
    };
  }, [items]);

  if (isLoading || isError)
    return (
      <AppShell>
        <PageHeader title="Statistiche" subtitle="Il tuo ritmo di lettura" />
        <p role={isError ? "alert" : "status"} className="editorial-empty">
          {isError
            ? "Le statistiche non sono disponibili. Ricarica la pagina per riprovare."
            : "Caricamento…"}
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
        <Card label="Pagine lette" value={stats.totalPages} />
        <Card
          label="Tempo stimato"
          value={`${stats.hours} h`}
          hint={`≈ ${Math.round(stats.hours / 24)} giorni`}
        />
        <Card label="Ritmo medio" value={`${stats.pace} pag/g`} />
        <Card label="Ultimi 7 giorni" value={stats.last7} />
        <Card label="Ultimi 30 giorni" value={stats.last30} />
        <Card label="Ultimi 90 giorni" value={stats.last90} />
        <Card
          label="Completamento"
          value={`${stats.completion}%`}
          hint={`${stats.read.length}/${stats.started} iniziati`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Libri letti per mese">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
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
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 font-display font-semibold">{title}</h2>
      {children}
    </div>
  );
}
