import { memo } from "react";
import { useTranslate } from "@/lib/use-ui-language";
import { UiText } from "@/lib/ui-language-context";
import type { readingStatistics } from "@/lib/reading-statistics";
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

const colors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

export const StatsCharts = memo(function StatsCharts({
  stats,
  year,
}: {
  stats: ReturnType<typeof readingStatistics>;
  year: number;
}) {
  const t = useTranslate();
  return (
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
  );
});

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
