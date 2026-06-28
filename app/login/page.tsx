"use client";

import { ArrowRight, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/app/AuthContext";
import { Eyebrow, Page, SectionCard } from "@/components/PimbasLayout";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      await login(email, pass);
      router.push("/groups");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page className="grid content-center lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.72fr)] lg:items-center lg:gap-8">
      <section className="relative -mx-4 -mt-[18px] min-h-[48vh] overflow-hidden bg-primary px-4 py-8 text-primary-foreground [background-image:linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%),var(--field-rods)] md:-mx-7 md:px-7 lg:mx-0 lg:mt-0 lg:min-h-[680px] lg:rounded-lg lg:px-8">
        <div className="grid h-full content-between gap-10">
          <div>
            <Eyebrow>Clube Pimbas</Eyebrow>
            <h1 className="max-w-xl font-display text-6xl uppercase leading-[0.92] max-[520px]:text-5xl">
              Mesa aberta. Placar pronto.
            </h1>
            <p className="mt-4 max-w-md text-base text-primary-foreground/78">
              Entre para organizar partidas, rankings e torneios de pimbolim sem planilha e sem
              debate no fim da rodada.
            </p>
          </div>
          <div className="grid max-w-sm grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-3">
              <strong className="block font-display text-3xl leading-none">2v2</strong>
              <small className="text-primary-foreground/72">amistosos</small>
            </div>
            <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-3">
              <strong className="block font-display text-3xl leading-none">KO</strong>
              <small className="text-primary-foreground/72">mata-mata</small>
            </div>
            <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-3">
              <strong className="block font-display text-3xl leading-none">PTS</strong>
              <small className="text-primary-foreground/72">ranking</small>
            </div>
          </div>
        </div>
      </section>

      <SectionCard title="Entrar na liga" className="mt-4 lg:mt-0">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleLogin();
          }}
        >
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@time.com"
                autoComplete="email"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <Input
                id="password"
                type="password"
                value={pass}
                onChange={(event) => setPass(event.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
              />
            </Field>
          </FieldGroup>
          <Button type="submit" className="h-12 w-full" disabled={busy || !email.trim() || !pass}>
            Entrar
            <ArrowRight data-icon="inline-end" />
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-3 text-sm">
          <span className="inline-flex items-center gap-2 font-medium">
            <Trophy className="size-4" />
            Primeira vez no clube?
          </span>
          <Link href="/signup" className="font-bold text-primary">
            Criar conta
          </Link>
        </div>
      </SectionCard>
    </Page>
  );
}
