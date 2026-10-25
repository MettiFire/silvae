import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { parseWikiquote, workLinks } from "./fragments/wikiquote-parser.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const cacheDir = resolve(root, "../work/fragment-import");
await mkdir(cacheDir, { recursive: true });
const registry = JSON.parse(
  await readFile(resolve(root, "scripts/fragments/sources.json"), "utf8"),
);
const excludedWorks = JSON.parse(
  await readFile(resolve(root, "scripts/fragments/excluded-works.json"), "utf8"),
);
const report = { generatedAt: new Date().toISOString(), sources: [], skipped: [], languages: {} };
const archive = {};
let previousLanguages = {};
try {
  previousLanguages =
    JSON.parse(await readFile(resolve(root, "public/fragments/manifest.json"), "utf8")).languages ??
    {};
} catch {
  /* First import. */
}
async function page(language, title) {
  const file = resolve(
    cacheDir,
    createHash("sha256")
      .update(language + title)
      .digest("hex") + ".json",
  );
  if (!args.has("--refresh")) {
    try {
      return JSON.parse(await readFile(file, "utf8"));
    } catch {
      /* Fetch missing snapshot. */
    }
  }
  await new Promise((r) => setTimeout(r, 1100));
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    redirects: "1",
    prop: "revisions",
    rvprop: "ids|content",
    rvslots: "main",
    titles: title,
  });
  const res = await fetch(`https://${language}.wikiquote.org/w/api.php?${params}`, {
    headers: {
      "User-Agent": "SilvaeFragmentImporter/1.0 (https://silvae.lovable.app; mettignis@gmail.com)",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw Error(`Wikiquote HTTP ${res.status}`);
  const data = await res.json();
  const p = Object.values(data.query?.pages ?? {})[0];
  const revision = p?.revisions?.[0];
  if (!revision) throw Error("Missing source revision");
  const out = { title: p.title, text: revision.slots.main["*"], revision: revision.revid };
  await writeFile(file, JSON.stringify(out));
  return out;
}
for (const [language, authors] of Object.entries(registry)) {
  if (args.has("--it-only") && language !== "it") continue;
  const entries = [];
  for (const [author, death] of Object.entries(authors)) {
    // Conservative allowlist of authors writing in the source language. Modern authors,
    // unknown dates and translations are not automatically eligible.
    if (death > new Date().getUTCFullYear() - 71) {
      report.skipped.push({ author, reason: "Author outside public-domain cutoff" });
      continue;
    }
    try {
      const source = await page(language, author);
      const lead = source.text.split(/^==/m)[0];
      if (!lead.includes(String(death))) {
        report.skipped.push({ author, reason: "Death year not confirmed in source lead" });
        continue;
      }
      const found = parseWikiquote({
        text: source.text,
        author,
        language,
        page: source.title,
        revision: source.revision,
      });
      entries.push(...found);
      report.sources.push({
        author,
        language,
        page: source.title,
        revision: source.revision,
        death,
        quotes: found.length,
      });
      // English Wikiquote frequently puts each novel on its own page.
      if (language === "en") {
        const header = source.text.split(/^==\s*Quotes/m)[0];
        const headings = source.text
          .split("\n")
          .filter((l) => /^={2,3}[^=]/.test(l))
          .join("\n");
        for (const link of workLinks(header + "\n" + headings).slice(0, 20)) {
          try {
            const work = await page(language, link.page);
            const cleanLead = work.text
              .split(/^==/m)[0]
              .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1");
            if (!cleanLead.toLowerCase().includes(author.toLowerCase())) continue;
            const excerpts = parseWikiquote({
              text: work.text,
              author,
              language,
              page: work.title,
              revision: work.revision,
              workTitle: link.title,
            });
            entries.push(...excerpts);
            report.sources.push({
              author,
              language,
              page: work.title,
              revision: work.revision,
              death,
              quotes: excerpts.length,
            });
          } catch (e) {
            report.skipped.push({ page: link.page, reason: e.message });
          }
        }
      }
      console.log(`${language}: ${author}: ${entries.length} candidate excerpts so far`);
    } catch (e) {
      report.skipped.push({ author, reason: e.message });
      console.log(`Skipped ${author}: ${e.message}`);
    }
  }
  const works = new Map();
  for (const entry of entries) {
    if (Object.hasOwn(excludedWorks, entry.workKey)) continue;
    const group = works.get(entry.workKey) ?? [];
    if (!group.some((e) => e.quote === entry.quote) && group.length < 3) group.push(entry);
    works.set(entry.workKey, group);
  }
  archive[language] = [...works.values()]
    .flat()
    .sort((a, b) => a.workKey.localeCompare(b.workKey) || a.id.localeCompare(b.id));
  report.languages[language] = {
    works: works.size,
    excerpts: archive[language].length,
    authors: new Set(archive[language].map((e) => e.author)).size,
  };
}
await mkdir(resolve(root, "public/fragments"), { recursive: true });
for (const [language, entries] of Object.entries(archive)) {
  if (!entries.length)
    throw Error(`No verified excerpts for ${language}; existing archive was not overwritten`);
  if (
    previousLanguages[language]?.works &&
    report.languages[language].works < previousLanguages[language].works * 0.8
  )
    throw Error(
      `Import lost too many works for ${language}; inspect the skipped sources before replacing the archive`,
    );
  const json = JSON.stringify(entries);
  const version = createHash("sha256").update(json).digest("hex").slice(0, 12);
  const file = `${language}-${version}.json`;
  await writeFile(resolve(root, "public/fragments", file), json + "\n");
  report.languages[language].file = file;
}
await writeFile(
  resolve(root, "public/fragments/manifest.json"),
  JSON.stringify(
    {
      version: 1,
      generatedAt: report.generatedAt,
      languages: { ...previousLanguages, ...report.languages },
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  resolve(root, "docs/fragment-import-report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report.languages, null, 2));
