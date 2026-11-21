import { lazy, Suspense, useState } from "react";
import { Link } from "@tanstack/react-router";
import { UiText } from "@/lib/ui-language-context";
import { BOOK_LANGUAGES } from "@/lib/book-language";
import { useAuth } from "@/lib/auth";
import { parsePreferences, PREFERENCES_FIELD, READING_GENRES } from "@/lib/reading-preferences";

const loadPreferencesDialog = () => import("./ReadingPreferencesDialog");
function preloadPreferencesDialog() {
  void loadPreferencesDialog().catch(() => undefined);
}

const PreferencesDialog = lazy(() =>
  loadPreferencesDialog().then(({ PreferencesDialog }) => ({ default: PreferencesDialog })),
);

export function ReadingPreferences({ onboarding = false }: { onboarding?: boolean }) {
  const { user, loading } = useAuth();
  const [manual, setManual] = useState(false);
  const [closedFor, setClosedFor] = useState<string | null>(null);
  if (!user || loading) return null;
  const prefs = parsePreferences(user.user_metadata[PREFERENCES_FIELD]);
  const automatic = onboarding && !prefs && closedFor !== user.id;
  return (
    <>
      {!onboarding && (
        <section className="mb-10 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold">
                <UiText text="I miei gusti di lettura" />
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {prefs?.status === "completed"
                  ? prefs.liked
                      .map((id) => READING_GENRES.find((g) => g.id === id)?.label)
                      .join(" · ")
                  : "Scegli cosa ami leggere: non servono voti o letture precedenti."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <UiText text="Lingua dei libri:" />{" "}
                <UiText
                  text={
                    prefs?.language === "any"
                      ? "tutte le lingue"
                      : !prefs?.language || prefs.language === "auto"
                        ? "automatica, dal browser"
                        : BOOK_LANGUAGES.find((l) => l.code === prefs.language)?.label
                  }
                />
              </p>
            </div>
            <button
              onMouseEnter={preloadPreferencesDialog}
              onFocus={preloadPreferencesDialog}
              onClick={() => setManual(true)}
              className="rounded-lg border border-border px-4 py-2 text-sm"
            >
              <UiText
                text={
                  prefs?.status === "completed" ? "Modifica i miei gusti" : "Scegli i miei gusti"
                }
              />
            </button>
          </div>
          <Link to="/discover" className="mt-3 inline-block text-sm text-primary">
            <UiText text="Vai ai consigli in Discover →" />
          </Link>
        </section>
      )}
      {(manual || automatic) && (
        <Suspense fallback={null}>
          <PreferencesDialog
            key={user.id}
            automatic={automatic}
            close={() => {
              setClosedFor(user.id);
              setManual(false);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
