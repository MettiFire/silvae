import test from "node:test";
import assert from "node:assert/strict";
import { fragmentTextParts, toggleFragmentEmphasis } from "../src/lib/fragment-format.ts";
test("renders only bold and italic, preserving ordinary text and line breaks", () => {
  assert.deepEqual(fragmentTextParts("A **bold** and *italic*\n***both***."), [
    { text: "A ", bold: false, italic: false },
    { text: "bold", bold: true, italic: false },
    { text: " and ", bold: false, italic: false },
    { text: "italic", bold: false, italic: true },
    { text: "\n", bold: false, italic: false },
    { text: "both", bold: true, italic: true },
    { text: ".", bold: false, italic: false },
  ]);
});
test("HTML and links remain literal text; incomplete emphasis is preserved", () => {
  const text = "<script>alert(1)</script> [link](javascript:alert(1)) **unfinished";
  assert.deepEqual(fragmentTextParts(text), [{ text, bold: false, italic: false }]);
});
test("toolbar preserves selection and toggles formatting off", () => {
  const added = toggleFragmentEmphasis("a word here", 2, 6, "**");
  assert.deepEqual(added, { text: "a **word** here", start: 4, end: 8 });
  assert.deepEqual(toggleFragmentEmphasis(added.text, added.start, added.end, "**"), {
    text: "a word here",
    start: 2,
    end: 6,
  });
  assert.deepEqual(toggleFragmentEmphasis("abc", 1, 1, "*"), { text: "a**bc", start: 2, end: 2 });
});
