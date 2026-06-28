export function LoadingState({ label = "Aquecendo a mesa..." }: { label?: string }) {
  return (
    <output className="grid min-h-[60vh] place-items-center p-6" aria-live="polite">
      <div className="grid place-items-center gap-3">
        <div className="relative h-14 w-32 overflow-hidden rounded-lg bg-primary ring-1 ring-[var(--pmb-gold)]/30 [background-image:var(--field-rods)]">
          {/* rod */}
          <div className="absolute inset-x-2 top-1/2 h-[2px] -mt-px bg-[var(--pmb-gold)]/70" />
          <div className="absolute left-1.5 top-1/2 size-2 -mt-1 rounded-full bg-[var(--pmb-paper)]" />
          <div className="absolute right-1.5 top-1/2 size-2 -mt-1 rounded-full bg-[var(--pmb-paper)]" />
          {/* bola, levemente atrasada em relação ao jogador para sugerir o drible no rod */}
          <div className="absolute left-1/2 top-3 size-[7px] -translate-x-1/2 rounded-full bg-[var(--pmb-clay)] motion-safe:animate-[pmb-rod-slide_1.5s_ease-in-out_0.12s_infinite_alternate]" />
          {/* jogador montado no rod */}
          <div className="absolute left-1/2 top-1/2 -mt-2 size-4 -translate-x-1/2 rounded-[3px] border-2 border-[var(--pmb-gold)] bg-[var(--pmb-paper)] motion-safe:animate-[pmb-rod-slide_1.5s_ease-in-out_infinite_alternate]" />
        </div>
        <p className="font-display text-sm uppercase tracking-[0.08em] text-foreground">{label}</p>
      </div>
    </output>
  );
}
