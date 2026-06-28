/**
 * The signature element: a chromed steel rod threaded with molded foosball
 * players — the most characteristic object in a pimbolim table — used as the
 * divider between sections instead of a plain rule.
 */

function FoosMan({ className }: { className?: string }) {
  // Frontal molded figure: round head, tapered torso, legs apart in a stance.
  return (
    <svg viewBox="0 0 44 60" className={className} aria-hidden="true">
      <circle cx="22" cy="10" r="7" />
      <path d="M14 18 H30 L28.5 36 H15.5 Z" />
      <path d="M15.5 35 L11 57 H16.5 L20.5 37 Z" />
      <path d="M28.5 35 L33 57 H27.5 L23.5 37 Z" />
    </svg>
  );
}

export function RodDivider({
  className = "",
  figureClassName = "text-[var(--pmb-clay)]",
  count = 3,
}: {
  className?: string;
  figureClassName?: string;
  count?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative flex h-16 w-full items-center justify-center ${className}`}
    >
      {/* the rod, spanning the full width with steel end-caps */}
      <div className="absolute inset-x-0 flex items-center">
        <span className="rod-cap -ml-1" />
        <span className="rod-bar flex-1" />
        <span className="rod-cap -mr-1" />
      </div>
      {/* the players, waist threaded onto the rod */}
      <div className="relative flex items-center gap-12 sm:gap-20">
        {Array.from({ length: count }).map((_, i) => (
          <FoosMan
            // biome-ignore lint/suspicious/noArrayIndexKey: figuras estáticas e idênticas
            key={i}
            className={`rod-figure h-11 w-8 -translate-y-[3px] fill-current ${figureClassName}`}
          />
        ))}
      </div>
    </div>
  );
}
