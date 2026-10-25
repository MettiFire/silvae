import { createHash } from "node:crypto";
const plain = (text) =>
  text
    .replace(/<ref\b[^>]*>[\s\S]*?<\/ref\s*>|<ref\b[^>]*\/\s*>/gi, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/''+/g, "")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
const excluded =
  /citazioni|quotes|bibliograf|external|links|about|letters?|lettere?|attribuit|unsourced|disputed|poems|poesie|short stories|speech|unpublished|frammenti|discorsi|incipit|explicit|note|references|see also/i;
export function parseWikiquote({ text, author, language, page, revision, workTitle }) {
  const results = [];
  let work = workTitle ?? null,
    section = workTitle ?? "",
    disallowed = false,
    blockedLevel = 0;
  for (const line of text.split("\n")) {
    const heading = line.match(/^(={2,5})\s*(.+?)\s*\1\s*$/);
    if (heading) {
      const level = heading[1].length,
        raw = heading[2],
        title = plain(raw).replace(/\s*\(\d{4}[^)]*\)\s*$/, "");
      if (blockedLevel && level > blockedLevel) continue;
      if (blockedLevel && level <= blockedLevel) {
        blockedLevel = 0;
        disallowed = false;
      }
      if (
        /citazioni su|quotes about|unsourced|disputed|misattributed|attribuite|senza fonte/i.test(
          title,
        )
      ) {
        disallowed = true;
        blockedLevel = level;
        work = null;
        continue;
      }
      if (workTitle) {
        if (level <= 2) disallowed = excluded.test(title) && !/^quotes$|citazioni$/i.test(title);
        section = title;
      } else if (
        level <= 3 &&
        /''/.test(raw) &&
        !excluded.test(title) &&
        !/[{}\[\]|]/.test(title)
      ) {
        work = title;
        section = title;
        disallowed = false;
      } else if (level === 2 && !/^quotes$|citazioni$/i.test(title)) {
        work = null;
        disallowed = false;
      } else section = title;
      continue;
    }
    if (disallowed || !/^\*[^*:]/.test(line)) continue;
    let quotedWork = work;
    if (!quotedWork && language === "it") {
      const ref = line.match(/<ref[^>]*>Da\s+''([^']+)''/i);
      if (ref && !/Citato in/i.test(line)) quotedWork = plain(ref[1]);
    }
    if (!quotedWork || excluded.test(quotedWork) || /[{}\[\]|]/.test(quotedWork)) continue;
    // Reject markup that would require guessing how to reconstruct the quotation.
    if (/\{\{|<!--|\[https?:|<poem|<blockquote/i.test(line)) continue;
    const raw = line.replace(/^\*\s*/, "");
    const quote = plain(raw)
      .replace(/\s*\((?:p\.|pp\.|cap\.|ch\.|chapter|book|vol\.|act|section)[^)]*\)\s*$/i, "")
      .trim();
    if (
      quote.length < 65 ||
      quote.length > 420 ||
      quote.split(/\s+/).length > 65 ||
      /[<>\[\]{}|]|\bISBN\b|^\d+\./.test(quote)
    )
      continue;
    if (!/[.!?…»”']$/.test(quote)) continue;
    if (
      /^\s*(?:[.…”]|—|[A-ZÀ-Ý ]{3,}:)/.test(quote) ||
      /\b(?:nigger|chink|fuck(?:ing)?|shits?|puttana)\b/i.test(quote)
    )
      continue;
    const workKey = normal(author) + ":" + normal(quotedWork);
    const id =
      "wq-" +
      createHash("sha256")
        .update(language + workKey + quote)
        .digest("hex")
        .slice(0, 16);
    results.push({
      id,
      quote,
      author,
      title: quotedWork,
      language,
      section: section || quotedWork,
      workKey,
      source: `https://${language}.wikiquote.org/w/index.php?title=${encodeURIComponent(page)}&oldid=${revision}`,
      revision,
      license: "4.0",
      sourceName: "Wikiquote",
    });
  }
  return results;
}
export function workLinks(text) {
  const links = [];
  for (const m of text.matchAll(/''(?:''')?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]''(?:''')?/g)) {
    const page = m[1],
      title = m[2] ?? page;
    if (!/[:#]/.test(page) && !excluded.test(title) && title.length > 3)
      links.push({ page, title });
  }
  return [...new Map(links.map((l) => [l.page, l])).values()];
}
function normal(s) {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
