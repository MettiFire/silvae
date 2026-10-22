import { unzipSync } from "fflate";
import { parseCSV, parseDate, normalize } from "./csv-import.ts";
import { descriptionText, sameBook } from "./book-metadata.ts";
import type { Book } from "./books";
import type { FragmentDraft, FragmentSource } from "./fragments";
export type ImportedFragment = FragmentDraft & {
  title: string;
  authors: string[];
  source: FragmentSource;
  sourceRef: string | null;
  sourceBookId: string | null;
  highlightedAt: string | null;
};
const draft = (
  quote: string,
  title = "",
  extra: Partial<ImportedFragment> = {},
): ImportedFragment => ({
  kind: "quote",
  quote: quote.trim(),
  title,
  authors: [],
  note: "",
  position: "",
  tags: [],
  favorite: false,
  source: "csv",
  sourceRef: null,
  sourceBookId: null,
  highlightedAt: null,
  ...extra,
});
export function parseKindleClippings(text: string) {
  const rows: ImportedFragment[] = [];
  let skipped = 0;
  for (const block of text.replace(/^\uFEFF/, "").split(/={8,}/)) {
    const lines = block.trim().split(/\r?\n/);
    if (lines.length < 3) continue;
    const metadata = lines[1] ?? "";
    if (
      !/highlight|evidenziazione|sottolineatura|markierung|surlignement|subrayado|destaque/i.test(
        metadata,
      )
    ) {
      skipped++;
      continue;
    }
    const heading = lines[0] ?? "";
    const author = heading.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
    const position = metadata
      .split("|")
      .filter((x) => /page|pagina|página|location|posizione|position|seite/i.test(x))
      .map((x) =>
        x
          .replace(
            /^\s*-?\s*(?:Your Highlight|La tua evidenziazione|La tua sottolineatura)\s*(?:on|alla|in)?\s*/i,
            "",
          )
          .trim(),
      )
      .join(" · ");
    const quote = lines.slice(2).join("\n").trim();
    if (quote)
      rows.push(
        draft(quote, author?.[1]?.trim() ?? heading, {
          authors: author?.[2] ? [author[2].trim()] : [],
          source: "kindle",
          position: position.slice(0, 300),
        }),
      );
  }
  return {
    rows,
    notices: skipped
      ? [
          `${skipped} note o segnalibri Kindle non riconosciuti come sottolineature sono stati esclusi.`,
        ]
      : [],
  };
}
export function parseFragmentCSV(
  text: string,
  bookIndex: Record<string, Record<string, string>> = {},
) {
  const csv = parseCSV(text);
  const bookshelf = csv.headers.includes("Study Level");
  const columns = new Map(csv.headers.map((c) => [normalize(c), c]));
  const value = (row: Record<string, string>, ...names: string[]) => {
    for (const n of names) {
      const c = columns.get(normalize(n));
      if (c && row[c]?.trim()) return row[c].trim();
    }
    return "";
  };
  const rows: ImportedFragment[] = [];
  for (const r of csv.rows) {
    const quote = value(
      r,
      ...(bookshelf
        ? ["Details"]
        : ["quote", "highlight", "text", "frase", "citazione", "testo", "details"]),
    );
    if (!quote) continue;
    const rawId = value(r, "Book ID");
    const info = bookIndex[rawId];
    const sourceId =
      info && /^googlebooks$/i.test(info["Book Source"] ?? "") ? (info["ID"] ?? null) : null;
    const position = value(
      r,
      "position",
      "location",
      "posizione",
      "pagina",
      "page",
      "Kindle Location",
    );
    rows.push(
      draft(
        bookshelf ? descriptionText(quote) : quote,
        value(r, "Book Title", "book_title", "titolo libro") ||
          (!bookshelf ? value(r, "Title", "titolo") : "") ||
          info?.["Title"] ||
          "",
        {
          authors: (value(r, "Author", "autore") || info?.["Author"] || "")
            .split(/;|\s+&\s+/)
            .map((a) => a.trim())
            .filter(Boolean),
          source: bookshelf
            ? "bookshelf"
            : value(r, "Source", "origine").toLowerCase() === "kobo"
              ? "kobo"
              : "csv",
          sourceBookId: sourceId,
          sourceRef: value(r, "id", "highlight id") || null,
          note: value(r, "note", "notes", "nota"),
          position: position || (bookshelf ? value(r, "Title") : ""),
          kind: /^(nota|note)$/i.test(value(r, "Type", "kind")) ? "note" : "quote",
          highlightedAt: parseDate(value(r, "Date Added", "highlighted_at", "date", "data")),
          tags: value(r, "tags", "tag")
            .split(/[,;]/)
            .map((t) => t.trim())
            .filter(Boolean),
        },
      ),
    );
  }
  if (!rows.length)
    throw new Error(
      "Nessuna citazione trovata. Il CSV deve avere una colonna Testo, Quote, Highlight o Details.",
    );
  return { rows, notices: [] as string[] };
}
export function parseMarkdownFragments(text: string) {
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
  const author = text.match(/^(?:author|autore)\s*:\s*(.+)$/im)?.[1]?.trim();
  const blocks = [...text.matchAll(/(?:^>[^\n]*(?:\n|$))+/gm)]
    .map((m) => m[0].replace(/^>\s?/gm, "").trim())
    .filter(Boolean);
  if (blocks.length)
    return {
      rows: blocks.map((q) => draft(q, title, { authors: author ? [author] : [] })),
      notices: [] as string[],
    };
  // Plain exports always stay editable in the preview before any write.
  const pieces = text
    .split(/\n\s*(?:={3,}|-{3,})\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    rows: pieces.map((q) => draft(q, title, { authors: author ? [author] : [] })),
    notices: [
      "Controlla i blocchi del file di testo: puoi correggere testo e libro nell’anteprima.",
    ],
  };
}
export function parseHTMLFragments(text: string) {
  if (typeof DOMParser === "undefined")
    throw new Error("Apri questo importatore nel browser per leggere il file HTML.");
  const inert = text.replace(/\b(?:src|srcset|href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  const doc = new DOMParser().parseFromString(inert, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed,link,img").forEach((n) => n.remove());
  const title = doc.querySelector("h1")?.textContent?.trim() ?? "";
  const nodes = [...doc.querySelectorAll("blockquote,mark,.highlight,.highlight-text")].filter(
    (n) => !n.parentElement?.closest("blockquote,mark,.highlight,.highlight-text"),
  );
  const rows = nodes.map((n) => draft(n.textContent ?? "", title)).filter((r) => r.quote);
  if (!rows.length)
    throw new Error(
      "Non riconosco le sottolineature di questo HTML. Esporta in TXT, Markdown o CSV.",
    );
  return { rows, notices: ["Verifica le citazioni estratte dall’HTML prima di importarle."] };
}
export function prepareFragmentImport(name: string, bytes: Uint8Array) {
  if (bytes.length > 10 * 1024 * 1024) throw new Error("Il file supera 10 MB.");
  const decode = (data: Uint8Array) => {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(data);
    } catch {
      return new TextDecoder("windows-1252").decode(data);
    }
  };
  let result: { rows: ImportedFragment[]; notices: string[] };
  if (/\.zip$/i.test(name)) {
    let size = 0;
    const files = unzipSync(bytes, {
      filter: (f) => {
        if (!/\.csv$/i.test(f.name) || f.name.startsWith("__MACOSX/")) return false;
        size += f.originalSize;
        if (size > 20 * 1024 * 1024) throw new Error("I CSV nello ZIP superano 20 MB.");
        return true;
      },
    });
    const names = Object.keys(files);
    const cards = names.filter((n) => /Bookshelf-Cards(?:-|\.csv)/i.test(n));
    const books = names.filter((n) => /Bookshelf-Books(?:-|\.csv)/i.test(n));
    if (cards.length !== 1 || books.length > 1)
      throw new Error("Carica un solo export Bookshelf con il file Cards.");
    const index: Record<string, Record<string, string>> = {};
    if (books[0])
      for (const row of parseCSV(decode(files[books[0]]!)).rows) index[row["ID"] ?? ""] = row;
    result = parseFragmentCSV(decode(files[cards[0]!]!), index);
    result.notices.push(
      "Sono stati letti solo i CSV necessari alle citazioni. I file restano sul tuo dispositivo.",
    );
  } else {
    const text = decode(bytes);
    result = /\.csv$/i.test(name)
      ? parseFragmentCSV(text)
      : /\.html?$/i.test(name)
        ? parseHTMLFragments(text)
        : /={8,}/.test(text) &&
            /highlight|evidenziazione|sottolineatura|markierung|surlignement|subrayado|destaque/i.test(
              text,
            )
          ? parseKindleClippings(text)
          : parseMarkdownFragments(text);
  }
  if (!result.rows.length) throw new Error("Nessuna citazione riconosciuta.");
  if (result.rows.length > 2000) throw new Error("Importa al massimo 2.000 frammenti per file.");
  return result;
}
export function matchFragmentBook(row: ImportedFragment, books: Book[]): string {
  const exact = row.sourceBookId ? books.find((b) => b.id === row.sourceBookId) : null;
  if (exact) return exact.id;
  if (!row.title || !row.authors.length) return "";
  const matches = books.filter((b) => sameBook({ title: row.title, authors: row.authors }, b));
  return matches.length === 1 ? matches[0]!.id : "";
}
