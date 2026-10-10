"use client";

interface ChessLogoProps {
  className?: string;
}

// A stylized chess knight (horse head) logo as inline SVG.
export function ChessLogo({ className }: ChessLogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19 22H5a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1Zm-1-5H6c0-3 .5-5 2.5-7 .8-.8 1.5-1.7 1.5-3 0-1 .3-2 1-2 .7 0 1 .5 1.2 1.2.3 1 .8 1.6 1.6 2.3.8.7 1.7 1.5 2.2 2.8.4 1 .5 2 .5 3.7Zm-7.5-9.5c-.3 0-.5.2-.5.5s.2.5.5.5.5-.2.5-.5-.2-.5-.5-.5Z" />
    </svg>
  );
}
