export function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="M16 8.6C13.4 6.6 10.2 5.8 5.8 5.8c-.7 0-1.3.6-1.3 1.3v16.1c0 .7.6 1.3 1.3 1.3 4.4 0 7.6.8 10.2 2.8 2.6-2 5.8-2.8 10.2-2.8.7 0 1.3-.6 1.3-1.3V7.1c0-.7-.6-1.3-1.3-1.3-4.4 0-7.6.8-10.2 2.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M16 8.6v18.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
