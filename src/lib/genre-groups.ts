/** Compact navigation taxonomy; original catalogue subjects remain untouched. */
export const GENRE_GROUPS = [
  {
    id: "fiction",
    label: "Romanzi e racconti",
    subjects: ["Fiction", "Classics"],
    match: /\b(fiction|novels?|romanz\w*|narrativa|classics?|classici|literary|stories|racconti)\b/,
  },
  {
    id: "speculative",
    label: "Fantasy, fantascienza e horror",
    subjects: ["Fantasy", "Science Fiction", "Horror"],
    match: /fantasy|fantascienza|science fiction|horror|supernatural/,
  },
  {
    id: "mystery",
    label: "Gialli e thriller",
    subjects: ["Mystery", "Thriller"],
    match: /mystery|thriller|detective|gialli|crime|suspense/,
  },
  {
    id: "romance",
    label: "Romance",
    subjects: ["Romance"],
    match: /romance|romanzi rosa|love stories/,
  },
  {
    id: "history",
    label: "Storia e biografie",
    subjects: ["History", "Biography", "Memoir"],
    match: /history|historical|storia|storici|biograph|biograf|memoir|diar/,
  },
  {
    id: "nonfiction",
    label: "Saggi, scienza e cultura",
    subjects: ["Nonfiction", "Science", "Philosophy", "Art", "Business"],
    match:
      /non[ -]?fiction|sagg|essays?|science|scienz|nature|natura|philosoph|filosofi|psycholog|psicolog|societ|social|politic|business|econom|\bart\b|arte|cultura|religio|self.help/,
  },
  {
    id: "poetry",
    label: "Poesia e teatro",
    subjects: ["Poetry", "Drama"],
    match: /poetry|poesia|poesie|drama|teatro/,
  },
  {
    id: "comics",
    label: "Fumetti e graphic novel",
    subjects: ["Comics", "Graphic Novels", "Manga"],
    match: /comics?|graphic novel|manga|fumetti/,
  },
  {
    id: "young",
    label: "Bambini e ragazzi",
    subjects: ["Juvenile Fiction", "Young Adult"],
    match: /juvenile|young adult|children|bambini|ragazzi/,
  },
] as const;
export function genreGroups(categories: readonly string[]) {
  const normalized = categories.map((c) =>
    c
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
  );
  const matches = GENRE_GROUPS.filter((group) =>
    normalized.some((category) =>
      group.match.test(
        group.id === "nonfiction"
          ? category.replace(/science fiction|fantascienza/g, "").replace(/historical fiction/g, "")
          : group.id === "fiction"
            ? category.replace(/non[ -]?fiction/g, "").replace(/graphic novels?/g, "")
            : category,
      ),
    ),
  ).map((group) => group.id as string);
  return matches.length ? matches : ["other"];
}
export function genreQuery(id: string) {
  const group = GENRE_GROUPS.find((g) => g.id === id);
  return group
    ? `(${group.subjects.map((subject) => `subject:"${subject}"`).join(" OR ")})`
    : `subject:"${id.replace(/["\\]/g, "")}"`;
}
