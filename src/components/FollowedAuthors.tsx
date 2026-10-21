import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AUTHORS_FIELD, parseFollowedAuthors } from "@/lib/followed-authors";
export function FollowedAuthors() {
  const { user } = useAuth();
  const authors = parseFollowedAuthors(user?.user_metadata[AUTHORS_FIELD]);
  return (
    <section className="mb-10">
      <h2 className="mb-2 font-display text-xl font-bold">Autori che segui</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Apri una pagina autore per controllare le opere più recenti presenti nel catalogo.
      </p>
      {authors.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((a) => (
            <Link
              key={a.id}
              to="/author/$author"
              params={{ author: a.name }}
              search={{ olid: a.id }}
              className="rounded-xl border border-border bg-card p-4 hover:border-primary"
            >
              <p className="font-display font-semibold">{a.name}</p>
              <p className="mt-1 text-xs text-primary">Bibliografia e uscite →</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ancora nessun autore salvato. Tocca il nome di un autore nella scheda di un libro e scegli
          Segui autore.
        </p>
      )}
    </section>
  );
}
