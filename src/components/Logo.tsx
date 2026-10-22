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
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}
