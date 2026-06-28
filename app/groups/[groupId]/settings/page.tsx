"use client";

import { ArrowLeft, Check, Copy, Crown, Save, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { Eyebrow, Page, PageHeader, PimbasAvatar, SectionCard } from "@/components/PimbasLayout";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateGroup } from "@/lib/api";
import type { MatchSettings } from "@/lib/domain";
import { useCurrentPlayerId, useGroup, usePlayers } from "@/lib/hooks";

export default function GroupSettingsPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params?.groupId || "group-trampo";
  const groupQuery = useGroup(groupId);
  const playersQuery = usePlayers(groupId);
  const currentPlayerIdQuery = useCurrentPlayerId();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [matchSettings, setMatchSettings] = useState<MatchSettings>({
    goalLimit: 3,
    timeLimitMinutes: 3,
    goldenGoal: true,
  });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!groupQuery.data) return;
    setName(groupQuery.data.name);
    setDesc(groupQuery.data.description);
    setMatchSettings(groupQuery.data.defaultMatchSettings);
  }, [groupQuery.data]);

  if (groupQuery.isLoading) return <LoadingState />;
  const group = groupQuery.data;
  const players = playersQuery.data ?? [];
  const currentPlayerId = currentPlayerIdQuery.data ?? "";
  const members = group ? players.filter((player) => group.memberIds.includes(player.id)) : [];
  const canManageInvite =
    !!group &&
    !!currentPlayerId &&
    group.adminPlayerIds.includes(currentPlayerId) &&
    !!group.inviteCode;

  const copyInviteCode = async () => {
    if (!group?.inviteCode) return;
    await navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Page>
      <PageHeader dark>
        <Eyebrow>Configurações</Eyebrow>
        <h1 className="font-display text-4xl uppercase leading-none">{group?.name ?? "Grupo"}</h1>
        <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
          Ajustes básicos da liga. Alterações aparecem nas telas de partidas, torneios e ranking.
        </p>
      </PageHeader>

      <SectionCard title="Identidade do grupo" className="mt-0">
        <form
          className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!group) return;
            setBusy(true);
            try {
              await updateGroup(groupId, {
                name: name.trim() || group.name,
                description: desc.trim() || group.description,
                defaultMatchSettings: matchSettings,
              });
            } finally {
              setBusy(false);
            }
          }}
        >
          <PimbasAvatar
            initials={group?.name?.[0] ?? "P"}
            src={group?.logoUrl}
            alt={group?.name}
            size="lg"
            className="shrink-0"
          />
          <div className="flex flex-1 flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="settings-name">Nome</FieldLabel>
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-description">Descrição</FieldLabel>
                <Input
                  id="settings-description"
                  value={desc}
                  onChange={(event) => setDesc(event.target.value)}
                />
              </Field>
            </FieldGroup>
            <FieldGroup className="grid gap-3 md:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="settings-goals">Gols padrão</FieldLabel>
                <Input
                  id="settings-goals"
                  type="number"
                  min={1}
                  value={matchSettings.goalLimit}
                  onChange={(event) =>
                    setMatchSettings({
                      ...matchSettings,
                      goalLimit: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-minutes">Minutos padrão</FieldLabel>
                <Input
                  id="settings-minutes"
                  type="number"
                  min={1}
                  value={matchSettings.timeLimitMinutes}
                  onChange={(event) =>
                    setMatchSettings({
                      ...matchSettings,
                      timeLimitMinutes: Number(event.target.value),
                    })
                  }
                />
              </Field>
              <Field className="flex items-center justify-between rounded-lg border border-border p-3">
                <FieldLabel htmlFor="settings-golden-goal">Gol de ouro</FieldLabel>
                <input
                  id="settings-golden-goal"
                  type="checkbox"
                  checked={matchSettings.goldenGoal}
                  onChange={(event) =>
                    setMatchSettings({
                      ...matchSettings,
                      goldenGoal: event.target.checked,
                    })
                  }
                  className="size-4 accent-[var(--pmb-felt)]"
                />
              </Field>
            </FieldGroup>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy || !group}>
                <Save data-icon="inline-start" />
                Salvar
              </Button>
              <Link
                href={`/groups/${groupId}`}
                className={buttonVariants({ variant: "secondary" })}
              >
                <ArrowLeft data-icon="inline-start" />
                Voltar
              </Link>
            </div>
          </div>
        </form>
      </SectionCard>

      {canManageInvite && group && (
        <SectionCard title="Convidar jogadores">
          <p className="text-sm text-muted-foreground">
            Compartilhe este código para que novos jogadores entrem na liga.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-lg border-2 border-dashed border-[var(--pmb-gold)] bg-[color-mix(in_oklch,var(--pmb-gold),white_85%)] px-4 py-2 font-display text-xl uppercase tracking-[0.18em] text-[var(--pmb-clay)]">
              {group.inviteCode}
            </span>
            <Button type="button" variant="secondary" onClick={copyInviteCode}>
              {copied ? (
                <>
                  <Check data-icon="inline-start" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy data-icon="inline-start" />
                  Copiar código
                </>
              )}
            </Button>
          </div>
        </SectionCard>
      )}

      {group && (
        <SectionCard
          title={
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" />
              Membros · {members.length}
            </span>
          }
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {members.map((player) => {
              const isAdmin = group.adminPlayerIds.includes(player.id);
              return (
                <li key={player.id} className="flex items-center gap-2.5 rounded-lg bg-muted p-2.5">
                  <PimbasAvatar
                    initials={player.initials}
                    src={player.avatarUrl}
                    alt={player.displayName}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {player.displayName}
                  </span>
                  {isAdmin && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 gap-1 uppercase text-[var(--pmb-clay)]"
                    >
                      <Crown className="size-3" />
                      Admin
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}
    </Page>
  );
}
