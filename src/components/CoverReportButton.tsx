import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import type { Book } from "@/lib/books";
import { toast } from "@/lib/localized-toast";
import { UiText } from "@/lib/ui-language-context";

const reportKey = (userId: string | undefined, bookId: string) =>
  ["cover-report", userId, bookId] as const;
const buttonClass = "button-outline inline-flex items-center gap-1.5 text-xs";

export function CoverReportButton({ book }: { book: Book }) {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const { data: reported, isLoading } = useQuery({
    queryKey: reportKey(userId, book.id),
    enabled: !!userId && !loading,
    staleTime: 60_000,
    queryFn: async ({ queryKey: [, reporterId, bookId] }) => {
      const { data, error } = await supabase
        .from("cover_reports")
        .select("book_id")
        .eq("user_id", reporterId!)
        .eq("book_id", bookId)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
  const report = useMutation({
    mutationFn: async (row: TablesInsert<"cover_reports">) => {
      const { error } = await supabase.from("cover_reports").insert(row);
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: (_, row) => client.setQueryData(reportKey(row.user_id, row.book_id), true),
    onError: () => toast.error("Segnalazione non salvata. Riprova."),
  });

  if (loading) return null;
  if (!userId) {
    return (
      <Link
        to="/auth"
        search={{ returnTo: `/book/${encodeURIComponent(book.id)}` }}
        className={buttonClass}
      >
        <Flag size={12} aria-hidden="true" />
        <UiText text="Accedi per segnalare" />
      </Link>
    );
  }
  if (reported) {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 text-xs text-primary">
        <Check size={12} aria-hidden="true" />
        <UiText text="Copertina segnalata" />
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={report.isPending || isLoading}
      className={buttonClass}
      onClick={() =>
        report.mutate({
          user_id: userId,
          book_id: book.id,
          book_title: Array.from(book.title.trim()).slice(0, 500).join(""),
          book_authors: Array.from(book.authors.join(", ")).slice(0, 1000).join(""),
        })
      }
    >
      <Flag size={12} aria-hidden="true" />
      <UiText text={report.isPending ? "Invio in corso…" : "Segnala copertina mancante"} />
    </button>
  );
}
