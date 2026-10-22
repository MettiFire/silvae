import { authorNameKey } from "./followed-authors.ts";

/** CSV exports often write authors as “Surname, Given name”. */
export function authorCountryKey(name: string) {
  return authorNameKey(name.includes(",") ? name.split(",").reverse().join(" ") : name);
}
