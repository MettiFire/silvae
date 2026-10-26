export type FragmentTextPart = { text: string; bold: boolean; italic: boolean };

/** Only emphasis is supported. HTML, links and images remain ordinary text. */
export function fragmentTextParts(text: string): FragmentTextPart[] {
  const parts: FragmentTextPart[] = [];
  const emphasis = /\*\*\*([^*\n]+)\*\*\*|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
  let start = 0;
  for (const match of text.matchAll(emphasis)) {
    if (match.index > start)
      parts.push({ text: text.slice(start, match.index), bold: false, italic: false });
    parts.push({
      text: match[1] ?? match[2] ?? match[3]!,
      bold: match[1] !== undefined || match[2] !== undefined,
      italic: match[1] !== undefined || match[3] !== undefined,
    });
    start = match.index + match[0].length;
  }
  if (start < text.length) parts.push({ text: text.slice(start), bold: false, italic: false });
  return parts;
}

export function toggleFragmentEmphasis(
  text: string,
  start: number,
  end: number,
  marker: "*" | "**",
) {
  const selected = text.slice(start, end);
  if (
    start >= marker.length &&
    text.slice(start - marker.length, start) === marker &&
    text.slice(end, end + marker.length) === marker
  ) {
    return {
      text: text.slice(0, start - marker.length) + selected + text.slice(end + marker.length),
      start: start - marker.length,
      end: end - marker.length,
    };
  }
  return {
    text: text.slice(0, start) + marker + selected + marker + text.slice(end),
    start: start + marker.length,
    end: end + marker.length,
  };
}
