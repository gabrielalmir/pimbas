/**
 * Limiter em memória, por instância — mesma garantia que o `@fastify/rate-limit`
 * antigo já tinha (a app roda em instância única; não escala entre instâncias).
 */
const hits = new Map<string, number[]>();

function clientKey(request: Request, scope: string): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  return `${scope}:${ip}`;
}

/** Retorna `true` se o limite foi excedido para essa combinação de IP + escopo. */
export function isRateLimited(
  request: Request,
  scope: string,
  max: number,
  windowMs: number,
): boolean {
  const key = clientKey(request, scope);
  const now = Date.now();
  const windowStart = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((timestamp) => timestamp > windowStart);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

/** Test-only: limpa o estado em memória entre testes (todas as requisições de teste compartilham o mesmo "IP" desconhecido). */
export function resetRateLimits(): void {
  hits.clear();
}
