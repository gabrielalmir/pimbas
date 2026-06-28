"use client";

import { CircleCheck, Dices, Shield, Trophy, UsersRound, X, Zap } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import {
  Eyebrow,
  KindBadge,
  Page,
  PageHeader,
  PimbasAvatar,
  SectionCard,
} from "@/components/PimbasLayout";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ManualPairInput, MatchSettings } from "@/lib/domain";
import { playerName } from "@/lib/format";
import { useCreateTournament, useGroup, usePlayers, useTournaments } from "@/lib/hooks";

export default function TournamentsPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params?.groupId || "group-trampo";
  const router = useRouter();

  const groupQuery = useGroup(groupId);
  const playersQuery = usePlayers(groupId);
  const tournamentsQuery = useTournaments(groupId);
  const createTournament = useCreateTournament();

  const [name, setName] = useState("Copa Relâmpago");
  const [pairMode, setPairMode] = useState<"random" | "manual">("random");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manualPairs, setManualPairs] = useState<ManualPairInput[]>([]);
  const [draftGoalkeeper, setDraftGoalkeeper] = useState<string | null>(null);
  const [draftAttacker, setDraftAttacker] = useState<string | null>(null);
  const [settings, setSettings] = useState<MatchSettings>({
    goalLimit: 3,
    timeLimitMinutes: 3,
    goldenGoal: true,
  });

  const group = groupQuery.data;
  const players = (playersQuery.data ?? []).filter((player) =>
    group?.memberIds.includes(player.id),
  );

  const assignedIds = useMemo(
    () => new Set(manualPairs.flatMap((pair) => [pair.goalkeeperId, pair.attackerId])),
    [manualPairs],
  );
  const unassignedIds = selectedIds.filter((id) => !assignedIds.has(id));

  useEffect(() => {
    if (!group) return;
    setSettings(group.defaultMatchSettings);
  }, [group]);

  const selectedError =
    pairMode === "random"
      ? selectedIds.length % 2 !== 0
        ? "Escolha número par de jogadores."
        : selectedIds.length < 4
          ? "Escolha pelo menos 4 jogadores."
          : ""
      : manualPairs.length < 2
        ? "Monte pelo menos duas duplas."
        : unassignedIds.length > 0
          ? "Ainda ha jogadores sem dupla."
          : "";

  if (!group || playersQuery.isLoading || tournamentsQuery.isLoading) return <LoadingState />;

  const statusLabel: Record<string, string> = {
    draft: "Rascunho",
    live: "Em andamento",
    finished: "Finalizado",
  };

  const togglePlayer = (playerId: string) => {
    setSelectedIds((current) =>
      current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId],
    );
    setManualPairs([]);
    setDraftGoalkeeper(null);
    setDraftAttacker(null);
  };

  const pickForManualPair = (playerId: string) => {
    if (draftGoalkeeper === playerId) return setDraftGoalkeeper(null);
    if (draftAttacker === playerId) return setDraftAttacker(null);
    if (!draftGoalkeeper) return setDraftGoalkeeper(playerId);
    if (!draftAttacker) return setDraftAttacker(playerId);
  };

  const addManualPair = () => {
    if (!draftGoalkeeper || !draftAttacker) return;
    setManualPairs((current) => [
      ...current,
      {
        name: `Dupla ${current.length + 1}`,
        goalkeeperId: draftGoalkeeper,
        attackerId: draftAttacker,
      },
    ]);
    setDraftGoalkeeper(null);
    setDraftAttacker(null);
  };

  const removeManualPair = (index: number) => {
    setManualPairs((current) => current.filter((_, item) => item !== index));
  };

  const submit = async () => {
    if (selectedError) return;
    const tournament =
      pairMode === "manual"
        ? await createTournament.mutateAsync({
            groupId,
            name,
            manualPairs,
            settings,
          })
        : await createTournament.mutateAsync({
            groupId,
            name,
            playerIds: selectedIds,
            settings,
          });
    router.push(`/tournaments/${tournament.id}`);
  };

  return (
    <Page>
      <PageHeader>
        <Eyebrow>Torneios</Eyebrow>
        <h1 className="font-display text-3xl uppercase leading-none">Mata-mata do grupo</h1>
        <p className="mt-1 text-sm text-primary-foreground/80">
          Duplas fixas, chaveamento aleatório e terceiro lugar antes da final.
        </p>
      </PageHeader>

      <SectionCard title="Novo torneio">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="tournament-name">Nome</FieldLabel>
            <Input
              id="tournament-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
        </FieldGroup>
        <div className="mt-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg uppercase leading-none">Jogadores</h3>
          <span className="inline-grid min-h-8 min-w-11 place-items-center rounded-full bg-primary px-2 text-xs font-black text-primary-foreground">
            {selectedIds.length}
          </span>
        </div>
        <p className="mb-3 mt-2 text-sm text-muted-foreground" id="tournament-selection-help">
          Use um número par de jogadores.
        </p>
        <div
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-2"
          aria-describedby="tournament-selection-help"
        >
          {players.map((player) => {
            const isSelected = selectedIds.includes(player.id);
            return (
              <Button
                key={player.id}
                variant="outline"
                className={
                  isSelected
                    ? "h-12 justify-start gap-2 border-[var(--pmb-gold)] bg-[color-mix(in_oklch,var(--pmb-gold),white_88%)] font-extrabold"
                    : "h-12 justify-start gap-2 font-extrabold"
                }
                onClick={() => togglePlayer(player.id)}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${isSelected ? "Remover" : "Selecionar"} ${player.displayName}`}
                data-testid={`tournament-player-${player.initials.toLowerCase()}`}
              >
                <PimbasAvatar
                  initials={player.initials}
                  src={player.avatarUrl}
                  alt={player.displayName}
                  size="sm"
                  className={isSelected ? "ring-2 ring-[var(--pmb-gold)]" : undefined}
                />
                <span className="min-w-0 flex-1 truncate text-left">{player.displayName}</span>
                {isSelected && <CircleCheck className="size-4 shrink-0 text-[var(--pmb-clay)]" />}
              </Button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg uppercase leading-none">Formacao das duplas</h3>
        </div>
        <ToggleGroup
          value={[pairMode]}
          onValueChange={(value) => {
            const next = value[0] as "random" | "manual" | undefined;
            if (!next) return;
            setPairMode(next);
            setManualPairs([]);
            setDraftGoalkeeper(null);
            setDraftAttacker(null);
          }}
          variant="outline"
          className="mt-2 grid w-full grid-cols-2 rounded-lg bg-muted p-1"
        >
          <ToggleGroupItem value="random" className="w-full gap-1.5 font-black">
            <Dices className="size-4" />
            Aleatoria
          </ToggleGroupItem>
          <ToggleGroupItem value="manual" className="w-full gap-1.5 font-black">
            <UsersRound className="size-4" />
            Personalizada
          </ToggleGroupItem>
        </ToggleGroup>

        {pairMode === "random" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            O sistema sorteia as duplas a partir dos jogadores selecionados.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            <p className="text-sm text-muted-foreground" id="manual-pair-help">
              Toque em dois jogadores sem dupla: o primeiro vira goleiro, o segundo atacante.
            </p>
            <div
              className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-2"
              aria-describedby="manual-pair-help"
            >
              {selectedIds
                .filter((id) => unassignedIds.includes(id))
                .map((playerId) => {
                  const player = players.find((item) => item.id === playerId);
                  if (!player) return null;
                  const role =
                    draftGoalkeeper === playerId
                      ? "Goleiro"
                      : draftAttacker === playerId
                        ? "Atacante"
                        : undefined;
                  return (
                    <Button
                      key={playerId}
                      variant="outline"
                      type="button"
                      className={
                        role === "Goleiro"
                          ? "h-12 justify-start gap-2 border-[var(--pmb-felt)] bg-[color-mix(in_oklch,var(--pmb-felt),white_88%)] font-extrabold"
                          : role === "Atacante"
                            ? "h-12 justify-start gap-2 border-[var(--pmb-clay)] bg-[color-mix(in_oklch,var(--pmb-clay),white_88%)] font-extrabold"
                            : "h-12 justify-start gap-2 font-extrabold"
                      }
                      onClick={() => pickForManualPair(playerId)}
                      aria-pressed={Boolean(role)}
                    >
                      <PimbasAvatar
                        initials={player.initials}
                        src={player.avatarUrl}
                        alt={player.displayName}
                        size="sm"
                      />
                      <span className="min-w-0 flex-1 truncate text-left">
                        {player.displayName}
                      </span>
                      {role === "Goleiro" && (
                        <Shield className="size-4 shrink-0 text-[var(--pmb-felt)]" />
                      )}
                      {role === "Atacante" && (
                        <Zap className="size-4 shrink-0 text-[var(--pmb-clay)]" />
                      )}
                    </Button>
                  );
                })}
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={!draftGoalkeeper || !draftAttacker}
              onClick={addManualPair}
            >
              Adicionar dupla
            </Button>
            {manualPairs.length > 0 && (
              <div className="grid gap-2">
                {manualPairs.map((pair, index) => {
                  const goalkeeper = players.find((item) => item.id === pair.goalkeeperId);
                  const attacker = players.find((item) => item.id === pair.attackerId);
                  return (
                    <div
                      key={pair.name}
                      className="flex items-center justify-between gap-2 rounded-lg border-l-[3px] border-l-[var(--pmb-gold)] bg-card p-3"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex items-center gap-1.5 text-sm">
                          <PimbasAvatar
                            initials={goalkeeper?.initials}
                            src={goalkeeper?.avatarUrl}
                            alt={goalkeeper?.displayName}
                            size="sm"
                          />
                          <Shield className="size-3.5 shrink-0 text-[var(--pmb-felt)]" />
                          <span className="truncate">{playerName(players, pair.goalkeeperId)}</span>
                        </span>
                        <span className="text-muted-foreground">+</span>
                        <span className="flex items-center gap-1.5 text-sm">
                          <PimbasAvatar
                            initials={attacker?.initials}
                            src={attacker?.avatarUrl}
                            alt={attacker?.displayName}
                            size="sm"
                          />
                          <Zap className="size-3.5 shrink-0 text-[var(--pmb-clay)]" />
                          <span className="truncate">{playerName(players, pair.attackerId)}</span>
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${pair.name}`}
                        onClick={() => removeManualPair(index)}
                      >
                        <X data-icon="inline-start" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <FieldGroup className="mt-4 grid gap-3 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="tournament-goals">Gols</FieldLabel>
            <Input
              id="tournament-goals"
              type="number"
              min={1}
              value={settings.goalLimit}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  goalLimit: Number(event.target.value),
                })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="tournament-minutes">Minutos</FieldLabel>
            <Input
              id="tournament-minutes"
              type="number"
              min={1}
              value={settings.timeLimitMinutes}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  timeLimitMinutes: Number(event.target.value),
                })
              }
            />
          </Field>
        </FieldGroup>
        {selectedError && (
          <p className="mt-3 text-sm font-medium text-destructive">{selectedError}</p>
        )}
        <Button
          className="mt-4 h-12 w-full"
          disabled={Boolean(selectedError) || createTournament.isPending}
          onClick={submit}
        >
          Gerar chaveamento
        </Button>
      </SectionCard>

      <SectionCard title="Em andamento">
        <div className="grid gap-2.5 md:grid-cols-2">
          {(tournamentsQuery.data ?? []).map((item) => (
            <Link
              key={item.id}
              href={`/tournaments/${item.id}`}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-foreground/10 bg-card p-3 shadow-[0_12px_28px_rgba(42,33,19,0.06)] transition-transform hover:-translate-y-0.5"
            >
              <span
                className={
                  item.status === "finished"
                    ? "grid size-10 shrink-0 place-items-center rounded-full border-2 border-[var(--pmb-gold)] bg-[color-mix(in_oklch,var(--pmb-gold),white_78%)] text-[var(--pmb-clay)]"
                    : "grid size-10 shrink-0 place-items-center rounded-full border-2 border-dashed border-border bg-muted text-muted-foreground"
                }
              >
                <Trophy className="size-5" />
              </span>
              <div className="grid min-w-0 flex-1 gap-1">
                <strong className="truncate">{item.name}</strong>
                <small className="text-muted-foreground">
                  {item.pairs.length} duplas - {item.settings.goalLimit} gols
                </small>
              </div>
              <KindBadge kind="tournament">{statusLabel[item.status] ?? item.status}</KindBadge>
            </Link>
          ))}
        </div>
      </SectionCard>
    </Page>
  );
}
