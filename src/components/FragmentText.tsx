import { fragmentTextParts } from "@/lib/fragment-format";
export function FragmentText({ text }: { text: string }) {
  return fragmentTextParts(text).map((part, index) => {
    const content = part.italic ? <em>{part.text}</em> : part.text;
    return part.bold ? <strong key={index}>{content}</strong> : <span key={index}>{content}</span>;
  });
}
