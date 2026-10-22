/** Alpha mask keeps the approved botanical mark in the active theme's ink colour. */
export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}`}
      style={{
        backgroundColor: "currentColor",
        maskImage: 'url("/images/silvae-tree.png")',
        WebkitMaskImage: 'url("/images/silvae-tree.png")',
        maskSize: "106.224% 120.755%",
        WebkitMaskSize: "106.224% 120.755%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "53.333% 59.091%",
        WebkitMaskPosition: "53.333% 59.091%",
      }}
    />
  );
}
