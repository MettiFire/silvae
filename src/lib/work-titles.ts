/** Exact work identifiers only: never guess a translation from a title search. */
const cache = new Map<string, { title: string | null; expires: number }>();
export function needsLocalizedTitle(title: string, language?: string) {
  return (
    !!language &&
    !["ru", "uk", "ar", "ja", "zh", "ko", "el"].includes(language) &&
    /[\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Han}\p{Script=Greek}\p{Script=Hiragana}\p{Script=Hangul}]/u.test(
      title,
    )
  );
}
export async function localizedWorkTitles(
  ids: string[],
  language?: string,
): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  if (!language || !/^[a-z]{2}$/.test(language)) return titles;
  const unique = [...new Set(ids.filter((id) => /^OL\d+W$/.test(id)))].slice(0, 24);
  const missing = unique.filter((id) => {
    const entry = cache.get(`${language}:${id}`);
    if (!entry || entry.expires < Date.now()) return true;
    if (entry.title) titles.set(id, entry.title);
    return false;
  });
  if (!missing.length) return titles;
  const query = `SELECT ?id ?label WHERE { VALUES ?id { ${missing.map((id) => `"${id}"`).join(" ")} } ?item <http://www.wikidata.org/prop/direct/P648> ?id . ?item <http://www.w3.org/2000/01/rdf-schema#label> ?label . FILTER(LANG(?label)="${language}") }`;
  try {
    const response = await fetch(
      `https://query.wikidata.org/sparql?${new URLSearchParams({ query, format: "json" })}`,
      { signal: AbortSignal.timeout(3500), headers: { Accept: "application/sparql-results+json" } },
    );
    if (!response.ok) return titles;
    const data = (await response.json()) as {
      results?: { bindings?: { id?: { value?: string }; label?: { value?: string } }[] };
    };
    if (!data.results?.bindings) return titles;
    for (const row of data.results.bindings) {
      const id = row.id?.value,
        title = row.label?.value?.trim();
      if (id && missing.includes(id) && title && title.length < 500 && !titles.has(id))
        titles.set(id, title);
    }
    for (const id of missing)
      cache.set(`${language}:${id}`, {
        title: titles.get(id) ?? null,
        expires: Date.now() + 86400000,
      });
    while (cache.size > 1000) cache.delete(cache.keys().next().value!);
  } catch {
    /* Edition metadata remains available when the secondary catalogue is offline. */
  }
  return titles;
}
