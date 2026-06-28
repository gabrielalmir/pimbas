"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { Eyebrow, Page, PageHeader, SectionCard } from "@/components/PimbasLayout";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createPlayerProfile } from "@/lib/api";
import type { FavoritePosition } from "@/lib/domain";

const POSITION_OPTIONS: { value: FavoritePosition; label: string; code: string }[] = [
  { value: "goalkeeper", label: "Goleiro", code: "GLR" },
  { value: "attacker", label: "Atacante", code: "ATA" },
  { value: "versatile", label: "Versátil", code: "VERS" },
];

export default function ProfileOnboarding() {
  const [form, setForm] = useState({
    displayName: "",
    initials: "",
    shirtNumber: 10,
    favoritePosition: "attacker" as FavoritePosition,
    style: "",
    nationality: "BRA",
    bio: "",
  });
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const positionEntry = POSITION_OPTIONS.find((option) => option.value === form.favoritePosition);

  const handle = async () => {
    if (!form.displayName.trim() || !form.initials.trim()) return;
    setBusy(true);
    setSaveError(null);
    try {
      await createPlayerProfile(form);
      window.location.href = "/groups";
    } catch {
      setSaveError("Não foi possível salvar sua ficha. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHeader dark>
        <Eyebrow>Ficha do jogador</Eyebrow>
        <h1 className="font-display text-4xl uppercase leading-none">
          Entre na mesa com identidade
        </h1>
        <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
          A ficha aparece em placares, rankings e sorteios. Use um nome fácil de reconhecer durante
          a rodada.
        </p>
      </PageHeader>

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,0.95fr)_minmax(280px,0.55fr)]">
        <SectionCard title="Dados de jogo" className="mt-0">
          <FieldGroup>
            <Field data-invalid={!form.displayName.trim()}>
              <FieldLabel htmlFor="display-name">Nome de mesa</FieldLabel>
              <Input
                id="display-name"
                value={form.displayName}
                onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                placeholder="Ex: Ze Trovao"
                aria-invalid={!form.displayName.trim()}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_140px]">
              <Field data-invalid={!form.initials.trim()}>
                <FieldLabel htmlFor="initials">Iniciais</FieldLabel>
                <Input
                  id="initials"
                  value={form.initials}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      initials: event.target.value.toUpperCase().slice(0, 3),
                    })
                  }
                  placeholder="ZT"
                  aria-invalid={!form.initials.trim()}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="shirt-number">Camisa</FieldLabel>
                <Input
                  id="shirt-number"
                  type="number"
                  min={0}
                  value={form.shirtNumber}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      shirtNumber: Number(event.target.value),
                    })
                  }
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Posição favorita</FieldLabel>
              <ToggleGroup
                value={[form.favoritePosition]}
                onValueChange={(value) => {
                  const next = value[0] as FavoritePosition | undefined;
                  if (next) setForm({ ...form, favoritePosition: next });
                }}
                variant="outline"
                className="grid grid-cols-3 rounded-lg bg-muted p-1"
              >
                {POSITION_OPTIONS.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    className="w-full font-black data-[pressed]:bg-background data-[pressed]:text-foreground data-[pressed]:shadow-sm"
                  >
                    {option.code}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Selecionado:{" "}
                <span className="font-semibold text-foreground">
                  {positionEntry?.label ?? "Versátil"}
                </span>
              </p>
            </Field>
            <Field>
              <FieldLabel htmlFor="style">Estilo</FieldLabel>
              <Input
                id="style"
                value={form.style}
                onChange={(event) => setForm({ ...form, style: event.target.value })}
                placeholder="Ex: defesa curta, chute seco"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="nationality">País</FieldLabel>
              <Input
                id="nationality"
                value={form.nationality}
                onChange={(event) =>
                  setForm({
                    ...form,
                    nationality: event.target.value.toUpperCase().slice(0, 3),
                  })
                }
                placeholder="BRA"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="bio">Frase da ficha</FieldLabel>
              <Input
                id="bio"
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                placeholder="Ex: marca no segundo pau"
              />
            </Field>
          </FieldGroup>
          {saveError && (
            <p className="mt-4 rounded-md bg-[color-mix(in_oklch,var(--pmb-clay),white_86%)] px-3 py-2 text-sm font-semibold text-[var(--pmb-clay)]">
              {saveError}
            </p>
          )}
          <Button
            className="mt-4 h-12 w-full"
            onClick={handle}
            disabled={busy || !form.displayName.trim() || !form.initials.trim()}
          >
            Salvar e continuar
            <ArrowRight data-icon="inline-end" />
          </Button>
        </SectionCard>

        <aside className="rounded-lg border border-foreground/10 bg-primary p-4 text-primary-foreground shadow-[0_14px_0_rgba(23,73,56,0.08),0_18px_34px_rgba(42,33,19,0.08)] [background-image:var(--field-rods)]">
          <Eyebrow>Prévia</Eyebrow>
          <div className="grid min-h-64 content-between rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 p-4">
            <div className="flex items-start justify-between gap-3">
              <strong className="font-display text-6xl leading-none text-[var(--pmb-gold)]">
                {form.shirtNumber || 0}
              </strong>
              <div className="flex flex-col items-end gap-1.5">
                <span className="rounded-full bg-[var(--pmb-gold)] px-3 py-1 text-xs font-black text-foreground">
                  {positionEntry?.code ?? "VERS"}
                </span>
                <span className="rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-black text-primary-foreground">
                  {form.nationality || "BRA"}
                </span>
              </div>
            </div>
            <div>
              <p className="font-display text-4xl uppercase leading-none">
                {form.initials || "??"}
              </p>
              <h2 className="mt-1 text-lg font-black">{form.displayName || "Nome de mesa"}</h2>
              <p className="mt-2 text-sm text-primary-foreground/75">
                {positionEntry?.label ?? "Versátil"}
                {form.style ? ` - ${form.style}` : ""}
              </p>
            </div>
          </div>
        </aside>
      </div>
    </Page>
  );
}
