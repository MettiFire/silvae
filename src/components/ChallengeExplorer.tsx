import { useRememberedState, useScreenEntryKey } from "@/lib/use-remembered-state";
import { UiDate } from "@/lib/ui-language-context";
import { UiText, UiElement } from "@/lib/ui-language-context";
import { countryFlag, countryReadingGroups } from "@/lib/challenge-country-display";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Award,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Compass,
  ExternalLink,
  Flag,
  Globe2,
  Loader2,
  Search,
  Target,
  Trophy,
} from "lucide-react";
import { toast } from "@/lib/localized-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ProgressBar } from "@/components/ProgressBar";
import { BookCover } from "@/components/BookCard";
import { resolveAuthorCountries } from "@/lib/author-countries.functions";
import { authorCountryKey } from "@/lib/author-country-key";
import { searchBooks } from "@/lib/books";
import type { LibraryItem } from "@/lib/library";
import { AWARDS_VERIFIED_AT, type AwardFamily } from "@/data/reading-awards";
import {
  CHALLENGE_CATALOGUE,
  READING_COUNTRY_CODES,
  countryName,
  AWARD_NAMES,
  awardBounds,
  fullAwardEnrollment,
  createEnrollment,
  challengeProgress,
  eligibleReading,
  validateEnrollment,
  type ChallengeEnrollment,
  type ChallengeId,
  type ChallengeSlot,
  type SlotAssignment,
} from "@/lib/reading-challenges";

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium transition hover:bg-accent disabled:opacity-50";
const primaryClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";
const iconFor = (id: ChallengeId) =>
  id === "countries"
    ? Globe2
    : id === "comfort-zone"
      ? Compass
      : id === "backlog" || id === "alphabet"
        ? BookOpen
        : id === "birth-year"
          ? Flag
          : Award;

export function ChallengeExplorer({
  library,
  enrollments,
  saving,
  onSave,
  onLeave,
}: {
  library: LibraryItem[];
  enrollments: ChallengeEnrollment[];
  saving: boolean;
  onSave: (value: ChallengeEnrollment) => Promise<unknown>;
  onLeave: (id: ChallengeId) => Promise<unknown>;
}) {
  const [tab, setTab] = useRememberedState<"explore" | "mine">("challenges.tab", "explore");
  const [filter, setFilter] = useRememberedState<"all" | "award" | "thematic">(
    "challenges.filter",
    "all",
  );
  const [active, setActive] = useRememberedState<ChallengeId | null>(
    "challenges.active",
    null,
    (value) => value === null || CHALLENGE_CATALOGUE.some((entry) => entry.id === value),
  );
  const draftEntry = useScreenEntryKey();
  const [draftState, updateDraft] = useState<{
    entry: string;
    value: ChallengeEnrollment | null;
  } | null>(null);
  const draft =
    draftState?.entry === draftEntry && draftState.value?.id === active
      ? draftState.value
      : active
        ? buildDraft(active)
        : null;
  const setDraft = (value: ChallengeEnrollment | null) => updateDraft({ entry: draftEntry, value });
  const [slotLimit, setSlotLimit] = useRememberedState<number>("challenges.limit", 20);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const enrolled = active ? enrollments.find((entry) => entry.id === active) : undefined;
  const definition = CHALLENGE_CATALOGUE.find((entry) => entry.id === active);
  const authors = useMemo(
    () => [
      ...new Map(
        library
          .flatMap((i) => i.books?.authors ?? [])
          .filter((name) => name.trim())
          .map((name) => [authorCountryKey(name), name]),
      ).values(),
    ],
    [library],
  );
  const countryQueries = useQueries({
    queries: authors.map((name) => ({
      queryKey: ["author-countries-v3", authorCountryKey(name)],
      queryFn: () => resolveAuthorCountries({ data: name }),
      enabled: active === "countries" || enrollments.some((e) => e.id === "countries"),
      staleTime: 5 * 60000,
      retry: false,
    })),
  });
  const authorCountries = Object.fromEntries(
    authors.map((name, i) => [authorCountryKey(name), countryQueries[i]?.data ?? []]),
  );
  const progress = useMemo(
    () => (draft ? challengeProgress(draft, library, authorCountries) : null),
    [draft, library, authorCountries],
  );
  function buildDraft(id: ChallengeId) {
    const existing = enrollments.find((entry) => entry.id === id);
    const next = fullAwardEnrollment(existing ?? createEnrollment(id));
    if (!existing && id === "backlog")
      next.backlogIds = library
        .filter((i) => i.status === "to_read")
        .slice(0, 5)
        .map((i) => i.book_id);
    return next;
  }
  function open(id: ChallengeId) {
    setDraft(buildDraft(id));
    setActive(id);
    setSlotLimit(20);
    setLeaveConfirm(false);
  }
  async function join() {
    if (!draft) return;
    const error = validateEnrollment(draft, library);
    if (error) {
      toast.error(error);
      return;
    }
    try {
      await onSave(draft);
      toast.success("Iscrizione salvata. Buona lettura!");
      setTab("mine");
    } catch (error) {
      toast.error((error as Error).message || "Iscrizione non salvata. Riprova.");
    }
  }
  async function assign(slot: ChallengeSlot, value: SlotAssignment | null) {
    if (!draft || !enrolled) return;
    const assignments = { ...draft.assignments };
    if (value) {
      if (
        Object.entries(assignments).some(
          ([id, a]) => id !== slot.id && !!value.bookId && a.bookId === value.bookId,
        )
      ) {
        toast.error("Questo libro è già associato a un’altra tappa della sfida.");
        return;
      }
      if (draft.id === "countries") {
        if (!value.country?.trim()) {
          toast.error("Indica il paese dell’autore.");
          return;
        }
        if (
          Object.entries(assignments).some(
            ([id, a]) =>
              id !== slot.id && a.country?.toUpperCase() === value.country?.toUpperCase(),
          )
        ) {
          toast.error("Scegli un paese diverso per ogni tappa.");
          return;
        }
      }
      assignments[slot.id] = value;
    } else delete assignments[slot.id];
    const next = { ...draft, assignments };
    try {
      await onSave(next);
      setDraft(next);
      toast.success(value ? "Libro associato alla tappa" : "Associazione rimossa");
    } catch (error) {
      toast.error((error as Error).message || "Modifica non salvata. Riprova.");
    }
  }
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <UiElement
          as="div"
          className="flex rounded-xl border border-border bg-card p-1"
          aria-label="Sezioni sfide"
        >
          <button
            onClick={() => setTab("explore")}
            aria-pressed={tab === "explore"}
            className={`${buttonClass} border-0 ${tab === "explore" ? "bg-accent text-primary" : ""}`}
          >
            <Compass className="h-4 w-4" />
            <UiText text="Esplora le sfide" />
          </button>
          <button
            onClick={() => setTab("mine")}
            aria-pressed={tab === "mine"}
            className={`${buttonClass} border-0 ${tab === "mine" ? "bg-accent text-primary" : ""}`}
          >
            <Target className="h-4 w-4" />
            <UiText text="Le mie sfide (" />
            {enrollments.length})
          </button>
        </UiElement>
        {tab === "explore" && (
          <UiElement
            as="select"
            aria-label="Tipo di sfida"
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className={`${inputClass} !w-auto`}
          >
            <option value="all">
              <UiText text="Tutti i percorsi" />
            </option>
            <option value="award">
              <UiText text="Premi letterari" />
            </option>
            <option value="thematic">
              <UiText text="Sfide tematiche" />
            </option>
          </UiElement>
        )}
      </div>
      {tab === "mine" && !enrollments.length && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <BookOpen className="mx-auto mb-3 h-8 w-8 text-primary" />
          <h2 className="font-display text-xl font-bold">
            <UiText text="La prossima avventura comincia qui" />
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <UiText text="Scegli un percorso e ritrova qui i tuoi progressi." />
          </p>
          <button onClick={() => setTab("explore")} className={`${primaryClass} mt-5`}>
            <UiText text="Esplora le sfide" />
          </button>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {CHALLENGE_CATALOGUE.filter((c) =>
          tab === "mine"
            ? enrollments.some((e) => e.id === c.id)
            : filter === "all" || c.kind === filter,
        ).map((c) => {
          const enrollment = enrollments.find((e) => e.id === c.id),
            p = enrollment ? challengeProgress(enrollment, library, authorCountries) : null;
          const Icon = iconFor(c.id);
          return (
            <article
              key={c.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-paper"
            >
              <div className={`flex items-center justify-between px-5 py-4 ${c.color}`}>
                <Icon className="h-7 w-7" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  <UiText
                    text={
                      p?.complete
                        ? "Percorso completato"
                        : c.kind !== "award" &&
                            enrollment?.deadline &&
                            enrollment.deadline < new Date().toISOString().slice(0, 10)
                          ? "Termine scaduto"
                          : enrollment
                            ? "In corso"
                            : c.kind === "award"
                              ? "Premi letterari"
                              : "Sfida tematica"
                    }
                  />
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-display text-xl font-bold leading-tight">
                  <UiText text={c.name} />
                </h2>
                <p className="mt-2 text-sm font-medium text-primary">
                  <UiText text={c.tagline} />
                </p>
                <p className="mb-5 mt-2 text-sm leading-relaxed text-muted-foreground">
                  <UiText text={c.description} />
                </p>
                {p && (
                  <div className="mt-auto mb-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span>
                        {p.percent}% · {p.done}
                        <UiText text=" di " />
                        {p.total}
                        <UiText text=" tappe" />
                      </span>
                      {p.complete && <Trophy className="h-4 w-4 text-primary" />}
                    </div>
                    <ProgressBar current={p.done} total={p.total} showLabel={false} />
                    {c.kind !== "award" && enrollment?.deadline && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <UiText text="Entro il" />{" "}
                        <UiDate value={new Date(enrollment.deadline + "T12:00:00")} />
                      </p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => open(c.id)}
                  className={`${enrollment ? buttonClass : primaryClass} mt-auto w-full`}
                >
                  <UiText text={enrollment ? "Apri il percorso" : "Scopri e iscriviti"} />
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <Dialog
        open={!!active}
        onOpenChange={(value) => {
          if (!value && !saving) {
            setActive(null);
            setDraft(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-x-hidden overflow-y-auto [&>*]:min-w-0">
          {definition && draft && progress && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  <UiText text={definition.name} />
                </DialogTitle>
                <DialogDescription>
                  <UiText text={definition.description} />
                </DialogDescription>
              </DialogHeader>
              {draft.id === "nobel" && (
                <div className="rounded-xl border border-border bg-accent/30 p-4 text-sm leading-relaxed">
                  <p className="font-medium">
                    <UiText text="Un autore Nobel, una lettura a tua scelta" />
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <UiText text="Ogni tappa rappresenta un autore premiato, nell’anno in cui ha ricevuto il Nobel. Basta una sua opera segnata come Letta, anche letta prima dell’iscrizione. Altri suoi libri non aggiungono tappe: la percentuale indica quanti autori premiati hai letto, non quanti libri." />
                  </p>
                </div>
              )}
              {!enrolled ? (
                <div className="space-y-5 rounded-xl border border-border bg-card p-4">
                  <h3 className="font-semibold">
                    <UiText
                      text={
                        definition.kind === "award"
                          ? "Tutto l’albo, una lettura alla volta"
                          : "Scegli il tuo percorso"
                      }
                    />
                  </h3>
                  {definition.kind === "award" && (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        <UiText text="Tutti i " />
                        {progress.total}
                        <UiText text=" vincitori presenti nell’albo verificato, senza intervalli o scadenze. Contano anche i libri già letti." />
                      </p>
                      <p className="font-display text-2xl">
                        {progress.percent}
                        <UiText text="% completato" />{" "}
                        <span className="font-sans text-sm text-muted-foreground">
                          · {progress.done}
                          <UiText text=" di " />
                          {progress.total}
                        </span>
                      </p>
                      <ProgressBar
                        current={progress.done}
                        total={progress.total}
                        showLabel={false}
                      />
                    </div>
                  )}
                  {draft.id === "birth-year" && (
                    <label className="block space-y-1 text-sm">
                      <UiText text="Premio da seguire" />
                      <select
                        className={inputClass}
                        value={draft.family}
                        onChange={(e) => {
                          const family = e.target.value as AwardFamily;
                          setDraft({ ...draft, family, toYear: awardBounds(family).max });
                        }}
                      >
                        {(["strega", "booker", "international", "europe"] as AwardFamily[]).map(
                          (f) => (
                            <option key={f} value={f}>
                              {AWARD_NAMES[f]}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  )}
                  {draft.id === "birth-year" && (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1 text-sm">
                          <UiText
                            text={
                              draft.id === "birth-year"
                                ? "Il tuo anno di nascita"
                                : "Dall’anno del premio"
                            }
                          />
                          <input
                            type="number"
                            min={1900}
                            max={draft.toYear}
                            className={inputClass}
                            value={draft.fromYear}
                            onChange={(e) =>
                              setDraft({ ...draft, fromYear: Number(e.target.value) })
                            }
                          />
                        </label>
                        <label className="space-y-1 text-sm">
                          <UiText text="Fino all’anno del premio" />
                          <input
                            type="number"
                            min={draft.fromYear}
                            max={awardBounds(draft.family).max}
                            className={inputClass}
                            value={draft.toYear}
                            onChange={(e) => setDraft({ ...draft, toYear: Number(e.target.value) })}
                          />
                        </label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {progress.total}
                        <UiText text=" tappe disponibili. Gli anni senza un premio assegnato non creano tappe. Sono inclusi soltanto premi già assegnati alla data di verifica." />
                      </p>
                    </>
                  )}
                  {draft.id === "backlog" && (
                    <>
                      <label className="block space-y-1 text-sm">
                        <UiText text="Quanti libri?" />
                        <select
                          value={draft.target}
                          className={inputClass}
                          onChange={(e) => {
                            const target = Number(e.target.value);
                            setDraft({
                              ...draft,
                              target,
                              backlogIds: library
                                .filter((i) => i.status === "to_read")
                                .slice(0, target)
                                .map((i) => i.book_id),
                            });
                          }}
                        >
                          {[5, 10, 20].map((n) => (
                            <option key={n} value={n}>
                              {n}
                              <UiText text=" libri" />
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="text-sm">
                        <UiText text="Scegli " />
                        {draft.target}
                        <UiText text=" libri: " />
                        {draft.backlogIds.length}
                        <UiText text=" selezionati." />
                      </p>
                      <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                        {library
                          .filter((i) => i.status === "to_read")
                          .map((item) => (
                            <label key={item.id} className="flex items-start gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={draft.backlogIds.includes(item.book_id)}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    backlogIds: e.target.checked
                                      ? [...draft.backlogIds, item.book_id]
                                      : draft.backlogIds.filter((id) => id !== item.book_id),
                                  })
                                }
                              />
                              <span>
                                {item.books?.title}{" "}
                                <span className="text-muted-foreground">
                                  — {item.books?.authors.join(", ")}
                                </span>
                              </span>
                            </label>
                          ))}
                        {!library.some((i) => i.status === "to_read") && (
                          <p className="text-sm text-muted-foreground">
                            <UiText text="Aggiungi prima qualche libro alla lista Da leggere." />
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  {definition.kind !== "award" && draft.id !== "backlog" && (
                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.includePast}
                        onChange={(e) => setDraft({ ...draft, includePast: e.target.checked })}
                      />
                      <UiText text="Conta anche i libri già letti prima dell’iscrizione" />
                    </label>
                  )}
                  {definition.kind !== "award" && (
                    <label className="block space-y-1 text-sm">
                      <UiText text="Scadenza facoltativa" />
                      <input
                        type="date"
                        className={inputClass}
                        min={draft.joinedAt.slice(0, 10)}
                        value={draft.deadline ?? ""}
                        onChange={(e) => setDraft({ ...draft, deadline: e.target.value || null })}
                      />
                    </label>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      disabled={saving || !!validateEnrollment(draft, library)}
                      onClick={() => void join()}
                      className={primaryClass}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      <UiText text="Iscriviti alla sfida" />
                    </button>
                    <span className="text-xs text-muted-foreground">
                      {validateEnrollment(draft, library) ??
                        "Puoi seguire più sfide contemporaneamente."}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-accent/40 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-semibold">
                      {progress.percent}% · {progress.done}
                      <UiText text=" di " />
                      {progress.total}
                      <UiText text=" tappe completate" />
                    </span>
                    {progress.complete && (
                      <span className="inline-flex items-center gap-2 text-sm text-primary">
                        <Trophy className="h-4 w-4" />
                        <UiText text="Traguardo raggiunto" />
                      </span>
                    )}
                  </div>
                  <ProgressBar current={progress.done} total={progress.total} showLabel={false} />
                  <p className="mt-3 text-xs text-muted-foreground">
                    <UiText
                      text={
                        draft.includePast
                          ? "Contano anche le letture precedenti."
                          : "Contano i libri terminati dal giorno dell’iscrizione."
                      }
                    />
                    {draft.deadline
                      ? ` Scadenza: ${new Date(draft.deadline + "T12:00:00").toLocaleDateString("it-IT")}.`
                      : " Senza scadenza."}{" "}
                    {definition.kind !== "award" &&
                      "Per i filtri sulle date è necessaria una data di fine lettura."}
                  </p>
                </div>
              )}
              <div className="mt-3 min-w-0">
                <h3 className="mb-3 font-display text-lg font-bold">
                  <UiText text="Le tappe del percorso" />
                </h3>
                <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                  <UiText text="Le corrispondenze sicure avanzano automaticamente dai libri segnati come Letto. Per traduzioni, edizioni o requisiti tematici, associa il libro corretto dalla tua libreria. Un libro conta una sola volta in ciascuna sfida." />
                </p>
                {draft.id === "countries" && (
                  <div className="mb-4 rounded-lg border border-border bg-accent/30 p-4 text-sm leading-relaxed">
                    <p className="font-medium">
                      <UiText text="Un paese attraverso i suoi autori" />
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      <UiText text="Usiamo la cittadinanza documentata dell’autore, non la lingua dell’edizione o della traduzione: la lingua originale può essere condivisa da molti paesi. Se l’autore ha più cittadinanze, puoi scegliere quale rappresentare; ogni libro conta una sola volta." />
                    </p>
                    <p className="mt-2 text-muted-foreground">
                      <UiText text="Dati mancanti, omonimi o stati storici senza corrispondenza certa restano da confermare. Puoi scegliere un paese e associare un libro dalla tua libreria." />
                    </p>
                  </div>
                )}
                {draft.id === "countries" && countryQueries.some((q) => q.isFetching) && (
                  <p role="status" className="mb-3 text-sm text-muted-foreground">
                    <UiText text="Recupero progressivo dei paesi degli autori… Le tappe si aggiornano automaticamente." />
                  </p>
                )}
                {draft.id === "alphabet" ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {progress.slots.map((slot) => (
                      <AlphabetSlot key={slot.id} slot={slot} />
                    ))}
                  </div>
                ) : definition.kind === "award" && draft.id !== "nobel" ? (
                  <>
                    <p className="mb-3 text-xs text-muted-foreground">
                      <UiText text="Scorri lungo il filo per attraversare gli anni. Apri i dettagli di una tappa per trovare o associare il libro." />
                    </p>
                    <UiElement
                      as="div"
                      className="award-trail"
                      role="list"
                      aria-label="Percorso dei libri premiati"
                      tabIndex={0}
                    >
                      {progress.slots.slice(0, slotLimit).map((slot) => (
                        <div
                          role="listitem"
                          key={slot.id}
                          className={`award-stop ${slot.completed ? "is-complete" : ""}`}
                        >
                          <div className="award-stop-rail" aria-hidden="true">
                            <span>
                              {slot.completed ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              )}
                            </span>
                          </div>
                          <SlotRow
                            trail
                            slot={slot}
                            enrollment={draft}
                            library={library}
                            joined={!!enrolled}
                            saving={saving}
                            onAssign={(value) => assign(slot, value)}
                          />
                        </div>
                      ))}
                    </UiElement>
                  </>
                ) : (
                  <div className="space-y-3">
                    {progress.slots.slice(0, slotLimit).map((slot) => (
                      <SlotRow
                        key={slot.id}
                        slot={slot}
                        enrollment={draft}
                        library={library}
                        joined={!!enrolled}
                        saving={saving}
                        onAssign={(value) => assign(slot, value)}
                      />
                    ))}
                  </div>
                )}
                {draft.id !== "alphabet" && progress.total > slotLimit && (
                  <button
                    className={`${buttonClass} mt-4 w-full`}
                    onClick={() => setSlotLimit((n) => n + 20)}
                  >
                    <ChevronDown className="h-4 w-4" />
                    <UiText text="Mostra altre tappe (" />
                    {progress.total - slotLimit})
                  </button>
                )}
              </div>
              {definition.kind === "award" || draft.id === "birth-year" ? (
                <p className="text-xs text-muted-foreground">
                  <UiText text="Albi verificati il" />{" "}
                  <UiDate value={new Date(AWARDS_VERIFIED_AT + "T12:00:00")} />
                  <UiText text=". Ogni tappa rimanda alla fonte ufficiale. Le edizioni e le traduzioni dello stesso libro possono essere associate manualmente." />
                </p>
              ) : null}
              {enrolled && (
                <div className="border-t border-border pt-4">
                  {leaveConfirm ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm">
                        <UiText text="Vuoi lasciare questa sfida? Le associazioni e le impostazioni del percorso saranno rimosse." />
                      </p>
                      <button
                        disabled={saving}
                        className={buttonClass}
                        onClick={() => setLeaveConfirm(false)}
                      >
                        <UiText text="Resta nella sfida" />
                      </button>
                      <button
                        disabled={saving}
                        className={`${buttonClass} text-destructive`}
                        onClick={async () => {
                          try {
                            await onLeave(enrolled.id);
                            setActive(null);
                            setDraft(null);
                            toast.success("Iscrizione rimossa");
                          } catch (error) {
                            toast.error((error as Error).message);
                          }
                        }}
                      >
                        <UiText text="Lascia la sfida" />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="text-sm text-muted-foreground underline"
                      onClick={() => setLeaveConfirm(true)}
                    >
                      <UiText text="Lascia questa sfida" />
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

type ResolvedSlot = ReturnType<typeof challengeProgress>["slots"][number];
function AlphabetSlot({ slot }: { slot: ResolvedSlot }) {
  const item = slot.completed ?? slot.matching.find((entry) => !!entry.books);
  return (
    <article
      className={`rounded-xl border p-4 ${slot.completed ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="font-display text-3xl">{slot.label}</h4>
        {slot.completed && <Check className="h-4 w-4 text-primary" aria-label="Letto" />}
      </div>
      {item?.books ? (
        <Link
          to="/book/$bookId"
          params={{ bookId: item.book_id }}
          className="flex items-start gap-3"
        >
          <BookCover book={item.books} className="h-20 w-14 shrink-0" fit="contain" />
          <span className="min-w-0">
            <span className="line-clamp-2 block text-sm font-medium">{item.books.title}</span>
            <span className="line-clamp-1 block text-xs text-muted-foreground">
              {item.books.authors.join(", ")}
            </span>
            <span className="mt-2 block text-xs text-primary">
              <UiText text={slot.completed ? "Letto" : "Da completare"} />
            </span>
          </span>
        </Link>
      ) : (
        <p className="text-xs text-muted-foreground">
          <UiText text="Trova una lettura per questa lettera" />
        </p>
      )}
    </article>
  );
}
function SlotRow({
  slot,
  enrollment,
  library,
  joined,
  saving,
  onAssign,
  trail = false,
}: {
  trail?: boolean;
  slot: ResolvedSlot;
  enrollment: ChallengeEnrollment;
  library: LibraryItem[];
  joined: boolean;
  saving: boolean;
  onAssign: (value: SlotAssignment | null) => Promise<void>;
}) {
  const [bookId, setBookId] = useState(slot.assignment?.bookId ?? "");
  const [country, setCountry] = useState(slot.country ?? "");
  const [showAssign, setShowAssign] = useState(false);
  const [showDetails, setShowDetails] = useRememberedState<boolean>(
    `challenges.slot.${slot.id}`,
    false,
  );
  const fixed = slot.fixedBookId
    ? library.find((item) => item.book_id === slot.fixedBookId)
    : undefined;
  const winner = slot.options[0];
  const title = winner
    ? (winner.title ?? winner.author)
    : (fixed?.books?.title ?? (slot.country ? countryName(slot.country) : slot.label));
  return (
    <article
      className={`${trail ? "award-stop-card" : "rounded-xl border p-4"} ${slot.completed ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
    >
      <div className="flex items-start gap-3">
        {!trail && (
          <span
            className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${slot.completed ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
          >
            {slot.completed ? <Check className="h-4 w-4" /> : <BookOpen className="h-3.5 w-3.5" />}
          </span>
        )}
        {trail && winner && (
          <BookCover
            className="h-28 w-20 shrink-0 rounded"
            fit="contain"
            book={{
              id: `award:${winner.id}`,
              title: winner.title ?? winner.author,
              authors: [winner.author],
              cover_url:
                slot.completed?.books?.custom_cover_url ??
                slot.completed?.books?.cover_url ??
                winner.cover ??
                null,
              published_year: null,
              page_count: null,
              categories: [],
              description: null,
            }}
          />
        )}
        {!trail && winner?.cover && (
          <UiElement
            as="img"
            src={winner.cover}
            alt={`Copertina di ${winner.title}`}
            width={56}
            height={80}
            decoding="async"
            referrerPolicy="no-referrer"
            loading="lazy"
            className={
              trail
                ? "h-28 w-20 shrink-0 rounded object-cover"
                : "hidden h-20 w-14 shrink-0 rounded-md object-cover sm:block"
            }
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            <UiText text={slot.label} />
            {slot.options.length > 1 ? " · vincitori ex aequo: scegli un libro" : ""}
          </p>
          <UiElement
            as="h4"
            className={`mt-1 font-display font-semibold ${trail ? "line-clamp-3 leading-snug" : ""}`}
            title={title}
          >
            {enrollment.id === "countries" && slot.country && (
              <span className="country-flag mr-2" aria-hidden="true">
                {countryFlag(slot.country)}
              </span>
            )}
            {title}
          </UiElement>
          {winner?.title && <p className="text-sm text-muted-foreground">{winner.author}</p>}
          {slot.options.slice(1).map((option) => (
            <p key={option.id} className="mt-1 text-sm">
              <UiText text="oppure " />
              {option.title} — {option.author}
            </p>
          ))}
          {slot.completed && enrollment.id !== "countries" && (
            <Link
              to="/book/$bookId"
              params={{ bookId: slot.completed.book_id }}
              className="mt-2 block text-sm text-primary"
            >
              <UiText text="Letto: " />
              {slot.completed.books?.title}
              {slot.country ? ` · ${countryName(slot.country)}` : ""}
            </Link>
          )}
          {enrollment.id === "countries" && <CountryReadings slot={slot} enrollment={enrollment} />}
          {!slot.completed && slot.assignment && enrollment.id !== "countries" && (
            <p className="mt-2 text-xs text-muted-foreground">
              <UiText text="Libro associato:" />{" "}
              {library.find((item) => item.book_id === slot.assignment?.bookId)?.books?.title ??
                "non più in libreria"}
              <UiText text=". Conta quando è Letto e rispetta le date della sfida." />
            </p>
          )}
          {slot.fixedBookId && !fixed && (
            <p className="mt-2 text-xs text-muted-foreground">
              <UiText text="Questo libro non è più in libreria." />
            </p>
          )}
        </div>
      </div>
      {trail && (
        <button
          type="button"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((value) => !value)}
          className="mt-4 w-full border-t border-border pt-3 text-left text-xs font-medium text-primary"
        >
          <UiText
            text={
              showDetails
                ? "Chiudi dettagli"
                : slot.completed
                  ? "Letto · Dettagli"
                  : "Da scoprire · Dettagli"
            }
          />
        </button>
      )}
      {(!trail || showDetails) && (
        <>
          <div className="mt-3 flex flex-wrap gap-2 pl-10">
            {winner && (
              <>
                <a
                  href={winner.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <UiText text="Fonte ufficiale" />
                </a>
                <AwardSearch title={winner.title ?? ""} author={winner.author} />
              </>
            )}
            {joined && !slot.fixedBookId && enrollment.id !== "alphabet" && (
              <button
                className={buttonClass}
                onClick={() => {
                  setCountry(slot.country ?? "");
                  setShowAssign((v) => !v);
                }}
              >
                <UiText
                  text={
                    enrollment.id === "countries"
                      ? "Scegli paese / conferma autore"
                      : slot.assignment
                        ? "Gestisci associazione"
                        : "Associa dalla mia libreria"
                  }
                />
              </button>
            )}
          </div>
          {showAssign && (
            <form
              className="mt-4 space-y-3 rounded-lg bg-accent/40 p-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (bookId || (enrollment.id === "countries" && country))
                  void onAssign({
                    bookId,
                    ...(enrollment.id === "countries" ? { country: country.trim() } : {}),
                  });
              }}
            >
              {enrollment.id === "countries" && (
                <label className="block space-y-1 text-sm">
                  <UiText text="Paese di provenienza dell’autore" />
                  <select
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">
                      <UiText text="Scegli il paese" />
                    </option>
                    {READING_COUNTRY_CODES.map((code) => ({ code, name: countryName(code) }))
                      .sort((a, b) => a.name.localeCompare(b.name, "it"))
                      .map(({ code, name }) => (
                        <option key={code} value={code}>
                          {name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <label className="block space-y-1 text-sm">
                <UiText
                  text={
                    enrollment.id === "countries"
                      ? "Facoltativo: conferma un libro se manca la nazionalità. Per i libri con un solo autore, la conferma vale anche per le sue altre opere."
                      : winner
                        ? winner.title
                          ? "Confermo che questo libro è l’opera premiata, anche in un’altra edizione o traduzione"
                          : `Confermo che questo libro è un’opera di ${winner.author}`
                        : "Confermo che questo libro soddisfa il requisito della tappa"
                  }
                />
                <select
                  required={enrollment.id !== "countries"}
                  value={bookId}
                  onChange={(e) => setBookId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">
                    <UiText
                      text={
                        enrollment.id === "countries"
                          ? "Automatico: tutti i libri di questo paese"
                          : "Scegli un libro dalla tua libreria"
                      }
                    />
                  </option>
                  {library.map((item) => (
                    <option key={item.id} value={item.book_id}>
                      {item.books?.title} — {item.books?.authors.join(", ")}
                      {eligibleReading(item, enrollment) ? " · Letto" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving || (enrollment.id === "countries" ? !country : !bookId)}
                  className={primaryClass}
                >
                  <UiText text="Salva associazione" />
                </button>
                {slot.assignment && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      void onAssign(null);
                      setBookId("");
                    }}
                    className={buttonClass}
                  >
                    <UiText text="Rimuovi associazione" />
                  </button>
                )}
              </div>
            </form>
          )}
        </>
      )}
    </article>
  );
}
function CountryReadings({
  slot,
  enrollment,
}: {
  slot: ResolvedSlot;
  enrollment: ChallengeEnrollment;
}) {
  const groups = countryReadingGroups(slot.matching, enrollment, slot.completed?.book_id);
  const row = (item: LibraryItem) => (
    <Link
      key={item.id}
      to="/book/$bookId"
      params={{ bookId: item.book_id }}
      className="block py-1 text-primary"
    >
      {item.books?.title}
    </Link>
  );
  return (
    <div className="mt-3 space-y-3 text-sm">
      <p className="text-xs text-muted-foreground">
        {slot.matching.length}
        <UiText text=" libri nella tua libreria" />
        {slot.completed ? " · Paese completato" : ""}
      </p>
      {groups.valid.length > 0 && (
        <UiElement as="section" aria-label="Letture valide">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            <UiText text={slot.completed ? "Letture che completano il paese" : "Letture valide"} />
          </p>
          {groups.valid.map(row)}
        </UiElement>
      )}
      {!slot.completed && groups.pending.length > 0 && (
        <UiElement as="section" aria-label="Libri ancora da leggere">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <UiText text="Da leggere o terminare" />
          </p>
          {groups.pending.map(row)}
        </UiElement>
      )}
      {!!slot.completed && groups.pending.length > 0 && (
        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            <UiText text="Altri libri da leggere · " />
            {groups.pending.length}
          </summary>
          <div className="mt-2">{groups.pending.map(row)}</div>
        </details>
      )}
      {groups.outside.length > 0 && (
        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            <UiText text="Altre letture · " />
            {groups.outside.length}
          </summary>
          <p className="mt-2 text-xs text-muted-foreground">
            <UiText text="Letture fuori dalle date della sfida o non disponibili per questa tappa." />
          </p>
          {groups.outside.map(row)}
        </details>
      )}
      {!slot.country && (
        <p className="text-xs text-muted-foreground">
          <UiText text="Paese da assegnare: conferma un’origine e scegli un libro dalla tua libreria." />
        </p>
      )}
    </div>
  );
}
function AwardSearch({ title, author }: { title: string; author: string }) {
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["award-search", title, author],
    enabled: open,
    queryFn: () =>
      searchBooks(`${title ? `intitle:"${title}" ` : ""}inauthor:"${author}"`, { max: 6 }),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
  return (
    <>
      <button className={buttonClass} onClick={() => setOpen(true)}>
        <Search className="h-3.5 w-3.5" />
        <UiText text="Trova nel catalogo" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title || author}</DialogTitle>
            <DialogDescription>
              <UiText text="Apri una scheda per aggiungere il libro alla libreria. Puoi scegliere anche un’altra edizione o traduzione tramite la ricerca globale." />
            </DialogDescription>
          </DialogHeader>
          {query.isPending && (
            <p role="status">
              <UiText text="Ricerca in corso…" />
            </p>
          )}
          {query.isError && (
            <p role="alert" className="text-sm">
              <UiText text="Il catalogo non risponde." />{" "}
              <button onClick={() => void query.refetch()} className="text-primary">
                <UiText text="Riprova" />
              </button>
            </p>
          )}
          {query.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              <UiText text="Nessun risultato. Cerca il titolo italiano o il nome dell’autore nella ricerca globale." />
            </p>
          )}
          <div className="space-y-3">
            {query.data?.map((book) => (
              <Link
                key={book.id}
                to="/book/$bookId"
                params={{ bookId: book.id }}
                className="flex gap-3 rounded-lg border border-border p-3"
              >
                <div className="w-12 shrink-0">
                  <BookCover book={book} />
                </div>
                <span>
                  <span className="block font-medium">{book.title}</span>
                  <span className="text-sm text-muted-foreground">{book.authors.join(", ")}</span>
                </span>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
