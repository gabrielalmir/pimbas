import { BarChart3, ChevronRight, Shield, Trophy, Users, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Eyebrow } from "@/components/PimbasLayout";
import { RodDivider } from "@/components/RodDivider";
import { ScrollReveal } from "@/components/ScrollReveal";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Trophy,
    title: "Torneios mata-mata",
    description:
      "Crie brackets eliminatórios em minutos. O sistema avança os vencedores automaticamente.",
  },
  {
    icon: Zap,
    title: "Placar ao vivo",
    description:
      "Registre gols durante a partida. Todos acompanham o placar em tempo real no celular.",
  },
  {
    icon: BarChart3,
    title: "Ranking do grupo",
    description: "Pontuação atualizada após cada rodada. Sem planilha, sem debate no WhatsApp.",
  },
  {
    icon: Users,
    title: "Times e amistosos",
    description: "Partidas 2v2 ou avulsas. Convide jogadores por link, sem precisar de conta.",
  },
] as const;

const steps = [
  {
    step: "1",
    title: "Crie seu grupo",
    description: "Dê um nome, defina as regras de pontuação e abra a mesa para o clube.",
  },
  {
    step: "2",
    title: "Convide os jogadores",
    description: "Compartilhe o link do grupo. Cada um entra com seu próprio perfil.",
  },
  {
    step: "3",
    title: "Jogue e pontue",
    description: "Registre partidas, acompanhe torneios e veja o ranking crescer.",
  },
] as const;

const stats = [
  { value: "∞", label: "partidas possíveis" },
  { value: "0", label: "planilhas necessárias" },
  { value: "1 min", label: "para começar" },
] as const;

const gallery = [
  {
    src: "/gallery/pimbolim-1.png",
    alt: "Grupo de amigos brasileiros jogando pimbolim e se divertindo",
    caption: "A roda",
  },
  {
    src: "/gallery/pimbolim-2.png",
    alt: "Amigos competindo intensamente na mesa de pimbolim",
    caption: "O clássico",
  },
  {
    src: "/gallery/pimbolim-3.png",
    alt: "Brasileira comemorando gol no pimbolim com amigos",
    caption: "A virada",
  },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-10">
        <span className="font-display text-2xl uppercase leading-none text-primary">Pimbas</span>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-foreground/70")}
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-[var(--pmb-clay)] text-white hover:bg-[var(--pmb-clay)]/90",
            )}
          >
            Criar conta
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden bg-primary text-primary-foreground [background-image:linear-gradient(150deg,rgba(255,255,255,0.07),transparent_48%),var(--field-rods)]"
        aria-label="Apresentação do Pimbas"
      >
        {/* Painted table markings — reads the felt as a table seen from above */}
        <div className="felt-lines">
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current" />
          <span className="absolute left-1/2 top-1/2 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-current md:size-72" />
          <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current" />
          <span className="absolute left-0 top-1/2 h-44 w-14 -translate-y-1/2 rounded-r-md border-2 border-l-0 border-current md:h-72 md:w-28" />
          <span className="absolute right-0 top-1/2 h-44 w-14 -translate-y-1/2 rounded-l-md border-2 border-r-0 border-current md:h-72 md:w-28" />
        </div>

        {/* Ambient score watermark */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-end overflow-hidden pr-4 md:pr-10"
        >
          <span
            className="select-none font-display leading-none text-white"
            style={{ fontSize: "clamp(7rem, 38vw, 28rem)", opacity: 0.04 }}
          >
            10 : 7
          </span>
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-12 md:px-10 md:pb-24 md:pt-16">
          <Eyebrow>Pimbolim · Torneios · Rankings</Eyebrow>

          <h1
            className="font-display uppercase leading-[0.88] text-[var(--pmb-paper-soft)]"
            style={{ fontSize: "clamp(4.5rem, 23vw, 15rem)" }}
          >
            PIMBAS
          </h1>

          <p className="mt-6 max-w-lg text-base text-primary-foreground/78 md:text-lg">
            Organize torneios, registre partidas e domine o ranking de pimbolim do seu grupo — tudo
            em tempo real, sem planilha.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 bg-[var(--pmb-clay)] px-6 text-white hover:bg-[var(--pmb-clay)]/90",
              )}
            >
              Começar agora
              <ChevronRight data-icon="inline-end" />
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 border-primary-foreground/30 bg-transparent px-6 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
              )}
            >
              Já tenho conta
            </Link>
          </div>

          {/* Mini scoreboard strip */}
          <div className="mt-12 flex w-fit flex-wrap gap-2">
            {(["2v2", "KO", "PTS"] as const).map((label) => (
              <div
                key={label}
                className="rounded border border-primary-foreground/15 bg-primary-foreground/10 px-4 py-2 text-center"
              >
                <strong className="block font-display text-2xl leading-none">{label}</strong>
                <small className="text-xs text-primary-foreground/60">
                  {label === "2v2" ? "amistosos" : label === "KO" ? "mata-mata" : "ranking"}
                </small>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GALLERY ─────────────────────────────────────────────────────── */}
      <section
        className="bg-[var(--pmb-paper)] px-6 pb-16 md:px-10 md:pb-20"
        aria-label="Galeria de momentos"
      >
        <div className="mx-auto max-w-6xl">
          {/* Signature: a steel rod of players bridges the felt into the page */}
          <RodDivider className="mb-12 md:mb-16" />

          <ScrollReveal>
            <Eyebrow className="text-[var(--pmb-felt)]">A mesa em ação</Eyebrow>
            <h2 className="font-display text-4xl uppercase leading-none text-[var(--pmb-felt)] md:text-5xl">
              DIVERSÃO DE VERDADE
            </h2>
            <p className="mt-3 max-w-lg text-[var(--pmb-ink-muted)]">
              Do primeiro gol ao torneio final — cada partida vira memória.
            </p>
          </ScrollReveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {gallery.map(({ src, alt, caption }, i) => (
              <ScrollReveal key={src} delay={(i + 1) as 1 | 2 | 3}>
                <figure className="group relative overflow-hidden rounded-xl border-2 border-[var(--pmb-felt)]/12 shadow-[0_10px_0_rgba(23,73,56,0.08),0_18px_30px_rgba(42,33,19,0.12)]">
                  <Image
                    src={src}
                    alt={alt}
                    width={800}
                    height={600}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    priority={i === 0}
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-[var(--pmb-felt-deep)]/55 via-transparent to-transparent"
                  />
                  <figcaption className="absolute bottom-3 left-3 rounded bg-[var(--pmb-felt-deep)]/85 px-3 py-1 font-display text-sm uppercase leading-none tracking-wide text-[var(--pmb-gold)]">
                    {caption}
                  </figcaption>
                </figure>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section className="bg-[var(--pmb-paper-soft)] px-6 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <Eyebrow className="text-[var(--pmb-felt)]">Funcionalidades</Eyebrow>
            <h2 className="font-display text-4xl uppercase leading-none text-[var(--pmb-felt)] md:text-5xl">
              TUDO QUE A MESA PRECISA
            </h2>
            <p className="mt-3 max-w-lg text-[var(--pmb-ink-muted)]">
              Do amistoso ao torneio, o Pimbas cobre cada momento da partida.
            </p>
          </ScrollReveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, description }, i) => (
              <ScrollReveal key={title} delay={(Math.min(i + 1, 3)) as 1 | 2 | 3}>
                <div className="h-full rounded-lg border border-[var(--pmb-paper-strong)] bg-card p-5 shadow-[0_8px_0_rgba(23,73,56,0.07),0_12px_24px_rgba(42,33,19,0.07)]">
                  <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-lg uppercase leading-none text-[var(--pmb-felt)]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--pmb-ink-muted)]">{description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="bg-[var(--pmb-paper)] px-6 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <Eyebrow className="text-[var(--pmb-felt)]">Como funciona</Eyebrow>
            <h2 className="font-display text-4xl uppercase leading-none text-[var(--pmb-felt)] md:text-5xl">
              TRÊS MOVIMENTOS
            </h2>
          </ScrollReveal>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map(({ step, title, description }, index) => (
              <ScrollReveal key={step} delay={(index + 1) as 1 | 2 | 3}>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--pmb-felt)] font-display text-xl leading-none text-[var(--pmb-gold)]">
                      {step}
                    </div>
                  </div>
                  <div className="pb-6 md:pb-0">
                    <h3 className="font-display text-lg uppercase leading-none text-[var(--pmb-felt)]">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm text-[var(--pmb-ink-muted)]">{description}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS SCOREBOARD ────────────────────────────────────────────── */}
      <section
        className="bg-[var(--pmb-felt-deep)] px-6 py-16 [background-image:var(--field-rods)] md:px-10 md:py-24"
        aria-label="Números do Pimbas"
      >
        <div className="mx-auto max-w-6xl">
          <RodDivider
            className="mb-12 md:mb-16"
            figureClassName="text-[var(--pmb-gold)]"
            count={4}
          />
          <ScrollReveal>
            <Eyebrow>Por que o Pimbas?</Eyebrow>
          </ScrollReveal>
          <div className="mt-6 grid gap-8 sm:grid-cols-3">
            {stats.map(({ value, label }, i) => (
              <ScrollReveal key={label} delay={(i + 1) as 1 | 2 | 3}>
                <div className="text-center sm:text-left">
                  <strong
                    className="block font-display leading-none text-[var(--pmb-gold)]"
                    style={{ fontSize: "clamp(3.5rem, 10vw, 7rem)" }}
                  >
                    {value}
                  </strong>
                  <span className="mt-1 block text-sm font-medium uppercase tracking-widest text-primary-foreground/60">
                    {label}
                  </span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="bg-[var(--pmb-clay)] px-6 py-16 text-white md:px-10 md:py-24">
        <div className="mx-auto max-w-6xl text-center">
          <ScrollReveal>
            <div className="mb-3 flex justify-center">
              <Shield className="size-10 opacity-60" aria-hidden="true" />
            </div>
            <h2
              className="font-display uppercase leading-none"
              style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)" }}
            >
              SUA MESA ESTÁ ESPERANDO
            </h2>
            <p className="mx-auto mt-4 max-w-md text-white/75">
              Crie sua conta em menos de um minuto e abra a primeira partida hoje.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 bg-white px-8 font-bold text-[var(--pmb-clay)] hover:bg-white/90",
                )}
              >
                Criar conta grátis
                <ChevronRight data-icon="inline-end" />
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-12 border-white/40 bg-transparent px-8 text-white hover:bg-white/10 hover:text-white",
                )}
              >
                Entrar
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="bg-[var(--pmb-felt-deep)] px-6 py-8 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <p className="font-display text-xl uppercase leading-none text-[var(--pmb-paper-soft)]">
              Pimbas
            </p>
            <p className="mt-1 text-xs text-primary-foreground/40">
              Gestão de partidas e torneios de pimbolim
            </p>
          </div>
          <p className="text-xs text-primary-foreground/30">
            © {new Date().getFullYear()} Pimbas. Feito para jogadores de verdade.
          </p>
        </div>
      </footer>
    </div>
  );
}
