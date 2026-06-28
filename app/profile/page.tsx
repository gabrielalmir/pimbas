"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/AuthContext";
import { LoadingState } from "@/components/LoadingState";
import { Eyebrow, Page, PageHeader, PimbasAvatar, SectionCard } from "@/components/PimbasLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { dataClient } from "@/lib/data-client-switch";
import type { FavoritePosition } from "@/lib/domain";
import { gravatarUrl } from "@/lib/gravatar";

const POSITION_OPTIONS: { value: FavoritePosition; label: string; code: string }[] = [
  { value: "goalkeeper", label: "Goleiro", code: "GLR" },
  { value: "attacker", label: "Atacante", code: "ATA" },
  { value: "versatile", label: "Versátil", code: "VERS" },
];

function FormDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="h-4 w-[3px] shrink-0 rounded-full bg-[var(--pmb-gold)]" />
      <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--pmb-gold)]">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export default function ProfilePage() {
  const { user, profile, reloadMe } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? "");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [initials, setInitials] = useState(profile?.initials ?? "");
  const [shirtNumber, setShirtNumber] = useState<number>(profile?.shirtNumber ?? 0);
  const [favoritePosition, setFavoritePosition] = useState<FavoritePosition>(
    profile?.favoritePosition ?? "versatile",
  );
  const [style, setStyle] = useState(profile?.style ?? "");
  const [nationality, setNationality] = useState(profile?.nationality ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");

  const [gravatarFallback, setGravatarFallback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.avatarUrl ?? "");
      setDisplayName(profile.displayName);
      setInitials(profile.initials);
      setShirtNumber(profile.shirtNumber);
      setFavoritePosition(profile.favoritePosition);
      setStyle(profile.style);
      setNationality(profile.nationality);
      setBio(profile.bio);
    }
  }, [profile]);

  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    gravatarUrl(user.email).then((url) => {
      if (!cancelled) setGravatarFallback(url);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  if (!user || !profile) return <LoadingState />;

  const previewSrc = avatarUrl.startsWith("http") ? avatarUrl : (gravatarFallback ?? undefined);
  const positionEntry = POSITION_OPTIONS.find((o) => o.value === favoritePosition);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setSaveStatus("idle");
    try {
      await dataClient.updatePlayerProfile({
        avatarUrl: avatarUrl.trim() || undefined,
        displayName: displayName.trim(),
        initials: initials.trim(),
        shirtNumber,
        favoritePosition,
        style: style.trim(),
        nationality: nationality.trim(),
        bio: bio.trim(),
      });
      await reloadMe();
      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHeader dark>
        <Eyebrow>Conta</Eyebrow>
        <h1 className="font-display text-4xl uppercase leading-none">Minha ficha</h1>
        <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
          Edite suas informações de jogador. Elas aparecem no placar, ranking e no seu cartão de
          jogador.
        </p>
      </PageHeader>

      {/* Player card preview — mirrors the public /players/[id] aside */}
      <div className="mt-3.5 overflow-hidden rounded-lg border border-primary/20 bg-primary text-primary-foreground shadow-[0_14px_0_rgba(23,73,56,0.08),0_18px_34px_rgba(42,33,19,0.08)] [background-image:linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%),var(--field-rods)]">
        <div className="grid justify-items-center border-b border-primary-foreground/15 px-5 py-6 text-center">
          <div className="mb-4 flex w-full items-start justify-between gap-3 text-[var(--pmb-gold)]">
            <div className="grid justify-items-start gap-0.5 text-left">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] opacity-70">
                Prévia
              </span>
              <strong className="font-display text-2xl leading-none">#{shirtNumber}</strong>
            </div>
            <Badge className="bg-[var(--pmb-gold)] text-foreground">
              {positionEntry?.code ?? "VERS"}
            </Badge>
          </div>
          <PimbasAvatar
            initials={initials || profile.initials}
            src={previewSrc}
            alt={displayName || profile.displayName}
            size="xl"
            className="text-3xl"
          />
          <h2 className="mt-4 font-display text-4xl uppercase leading-none">
            {displayName || profile.displayName}
          </h2>
          <p className="mt-1 text-sm text-primary-foreground/80">
            {positionEntry?.label ?? "Versátil"}
            {nationality ? ` · ${nationality}` : ""}
            {style ? ` · ${style}` : ""}
          </p>
          {bio && (
            <p className="mt-3 max-w-sm rounded-lg bg-primary-foreground/10 px-3 py-2 text-sm text-primary-foreground/86 italic">
              {bio}
            </p>
          )}
        </div>
      </div>

      {/* Edit form */}
      <SectionCard title="Editar ficha">
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <FieldGroup>
            <FormDivider label="Identidade" />

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px_120px]">
              <Field>
                <FieldLabel htmlFor="profile-display-name">Nome de exibição</FieldLabel>
                <Input
                  id="profile-display-name"
                  value={displayName}
                  maxLength={80}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Como você aparece nos placares"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="profile-initials">Iniciais</FieldLabel>
                <Input
                  id="profile-initials"
                  value={initials}
                  maxLength={4}
                  onChange={(e) => setInitials(e.target.value)}
                  placeholder="Ex: GB"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="profile-shirt-number">Camisa</FieldLabel>
                <Input
                  id="profile-shirt-number"
                  type="number"
                  min={0}
                  max={99}
                  value={shirtNumber}
                  onChange={(e) => setShirtNumber(Number(e.target.value))}
                />
              </Field>
            </div>

            <FormDivider label="Perfil de jogo" />

            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="profile-position">Posição favorita</FieldLabel>
                <select
                  id="profile-position"
                  value={favoritePosition}
                  onChange={(e) => setFavoritePosition(e.target.value as FavoritePosition)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {POSITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field>
                <FieldLabel htmlFor="profile-style">Estilo de jogo</FieldLabel>
                <Input
                  id="profile-style"
                  value={style}
                  maxLength={80}
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="Ex: Raça e garra"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="profile-nationality">Nacionalidade</FieldLabel>
                <Input
                  id="profile-nationality"
                  value={nationality}
                  maxLength={80}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="Ex: Brasileiro"
                />
              </Field>
            </div>

            <FormDivider label="Sobre você" />

            <Field>
              <FieldLabel htmlFor="profile-bio">Bio</FieldLabel>
              <textarea
                id="profile-bio"
                value={bio}
                maxLength={500}
                rows={4}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Uma frase sobre seu estilo de jogo..."
                className="flex min-h-[120px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{bio.length}/500</p>
            </Field>

            <Field>
              <FieldLabel htmlFor="profile-avatar">URL do avatar</FieldLabel>
              <Input
                id="profile-avatar"
                value={avatarUrl}
                maxLength={2048}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://... (deixe vazio para usar Gravatar)"
                type="url"
              />
              {gravatarFallback && !avatarUrl.startsWith("http") && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Sem URL? Usaremos seu Gravatar automaticamente.
                </p>
              )}
            </Field>
          </FieldGroup>

          {saveStatus === "success" && (
            <p className="rounded-md bg-[color-mix(in_oklch,var(--pmb-felt),white_86%)] px-3 py-2 text-sm font-semibold text-[var(--pmb-felt)]">
              Ficha atualizada com sucesso.
            </p>
          )}
          {saveStatus === "error" && (
            <p className="rounded-md bg-[color-mix(in_oklch,var(--pmb-clay),white_86%)] px-3 py-2 text-sm font-semibold text-[var(--pmb-clay)]">
              Erro ao salvar. Tente novamente.
            </p>
          )}

          <Button type="submit" disabled={busy} className="self-start">
            <Save data-icon="inline-start" />
            Salvar ficha
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="E-mail">
        <p className="text-sm text-muted-foreground">{user.email ?? "—"}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          O endereço de e-mail não pode ser alterado por aqui.
        </p>
      </SectionCard>
    </Page>
  );
}
