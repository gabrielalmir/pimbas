"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Eyebrow, Page, PageHeader, PimbasAvatar, SectionCard } from "@/components/PimbasLayout";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { CreateFriendlyInput, MatchSettings, PlayerProfile, TeamPair } from "@/lib/domain";
import { createPair, validateMatchSettings } from "@/lib/domain";
import { useCreateFriendly, useGroup, usePlayers } from "@/lib/hooks";

export default function NewFriendly() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId || "group-trampo";

  const groupQuery = useGroup(groupId);
  const playersQuery = usePlayers(groupId);
  const createFriendly = useCreateFriendly();
  const group = groupQuery.data;
  const players = (playersQuery.data ?? []).filter((player) =>
    group?.memberIds.includes(player.id),
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<MatchSettings>({
    goalLimit: 3,
    timeLimitMinutes: 3,
    goldenGoal: true,
  });
  const pairAName = "Time Verde";
  const pairBName = "Time Laranja";

  const errors = useMemo(() => validateMatchSettings(settings), [settings]);

  useEffect(() => {
    if (!group) return;
    setSettings(group.defaultMatchSettings);
  }, [group]);

  if (!group || playersQuery.isLoading) return <div className="p-8">Carregando...</div>;

  const togglePlayer = (playerId: string) => {
    setSelectedIds((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId);
      if (current.length >= 4) return current;
      return [...current, playerId];
    });
  };

  const submit = async () => {
    if (selectedIds.length !== 4 || errors.length > 0) return;
    const pairA: TeamPair = createPair("pa", pairAName, selectedIds[0], selectedIds[1]);
    const pairB: TeamPair = createPair("pb", pairBName, selectedIds[2], selectedIds[3]);
    const input: CreateFriendlyInput = {
      groupId,
      pairA,
      pairB,
      settings,
    };
    const match = await createFriendly.mutateAsync(input);
    window.location.href = `/matches/${match.id}/live`;
  };

  const findPlayer = (playerId: string): PlayerProfile | undefined =>
    players.find((player) => player.id === playerId);

  return (
    <Page>
      <PageHeader>
        <Eyebrow>Amistoso</Eyebrow>
        <h1 className="font-display text-3xl uppercase leading-none">Montar 2v2</h1>
        <p className="mt-1 text-sm text-primary-foreground/80">
          Escolha 4 jogadores. A ordem define goleiro e atacante de cada dupla.
        </p>
      </PageHeader>

      <SectionCard
        title="Jogadores"
        action={
          <span className="inline-grid min-h-8 min-w-11 place-items-center rounded-full bg-primary px-2 text-xs font-black text-primary-foreground">
            {selectedIds.length}/4
          </span>
        }
      >
        <p className="mb-3 text-sm text-muted-foreground" id="friendly-selection-help">
          Selecione exatamente quatro jogadores para iniciar.
        </p>
        <div
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-2"
          aria-describedby="friendly-selection-help"
        >
          {players.map((player) => (
            <Button
              key={player.id}
              variant="outline"
              className={
                selectedIds.includes(player.id)
                  ? "h-12 justify-start border-primary bg-primary/10 font-extrabold"
                  : "h-12 justify-start font-extrabold"
              }
              onClick={() => togglePlayer(player.id)}
              type="button"
              data-testid={`friendly-player-${player.initials.toLowerCase()}`}
              aria-pressed={selectedIds.includes(player.id)}
              aria-label={`${selectedIds.includes(player.id) ? "Remover" : "Selecionar"} ${player.displayName}`}
            >
              <PimbasAvatar
                initials={player.initials}
                src={player.avatarUrl}
                alt={player.displayName}
                size="sm"
              />
              {player.displayName}
            </Button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Duplas">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
          <div className="grid gap-1.5 rounded-lg bg-card p-3">
            <strong>Time Verde</strong>
            <small className="text-muted-foreground">
              Goleiro: {findPlayer(selectedIds[0])?.displayName ?? "-"}
            </small>
            <small className="text-muted-foreground">
              Atacante: {findPlayer(selectedIds[1])?.displayName ?? "-"}
            </small>
          </div>
          <div className="grid gap-1.5 rounded-lg bg-card p-3">
            <strong>Time Laranja</strong>
            <small className="text-muted-foreground">
              Goleiro: {findPlayer(selectedIds[2])?.displayName ?? "-"}
            </small>
            <small className="text-muted-foreground">
              Atacante: {findPlayer(selectedIds[3])?.displayName ?? "-"}
            </small>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Regra">
        <FieldGroup className="grid gap-3 md:grid-cols-3">
          <Field data-invalid={settings.goalLimit < 1}>
            <FieldLabel htmlFor="friendly-goals">Gols</FieldLabel>
            <Input
              id="friendly-goals"
              type="number"
              min={1}
              value={settings.goalLimit}
              aria-invalid={settings.goalLimit < 1}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  goalLimit: Number(event.target.value),
                })
              }
            />
          </Field>
          <Field data-invalid={settings.timeLimitMinutes < 1}>
            <FieldLabel htmlFor="friendly-minutes">Minutos</FieldLabel>
            <Input
              id="friendly-minutes"
              type="number"
              min={1}
              value={settings.timeLimitMinutes}
              aria-invalid={settings.timeLimitMinutes < 1}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  timeLimitMinutes: Number(event.target.value),
                })
              }
            />
          </Field>
          <Field className="flex items-center justify-between rounded-lg border border-border p-3">
            <FieldLabel htmlFor="friendly-golden-goal">Gol de ouro</FieldLabel>
            <Switch
              id="friendly-golden-goal"
              checked={settings.goldenGoal}
              onCheckedChange={(checked) => setSettings({ ...settings, goldenGoal: checked })}
            />
          </Field>
          {errors.map((error: string) => (
            <div key={error} className="md:col-span-3 text-destructive text-sm">
              {error}
            </div>
          ))}
        </FieldGroup>
      </SectionCard>

      <Button
        className="mt-3.5 h-12 w-full"
        data-testid="friendly-start-match"
        disabled={selectedIds.length !== 4 || errors.length > 0 || createFriendly.isPending}
        onClick={submit}
      >
        Iniciar partida
      </Button>
    </Page>
  );
}
