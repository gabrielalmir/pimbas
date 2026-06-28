import type { Match } from "@/lib/domain";
import { getScore } from "@/lib/domain";

export function ScoreBadge({ match }: { match: Match }) {
  const [scoreA, scoreB] = getScore(match);
  return (
    <div
      className="font-display inline-flex items-center gap-2 text-3xl text-[var(--pmb-gold)]"
      role="img"
      aria-label={`Placar ${scoreA} a ${scoreB}`}
    >
      <strong>{scoreA}</strong>
      <span>-</span>
      <strong>{scoreB}</strong>
    </div>
  );
}
