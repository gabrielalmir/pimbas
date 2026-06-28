"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Eyebrow, Page, PageHeader, PimbasAvatar, SectionCard } from "@/components/PimbasLayout";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createGroup, joinGroup } from "@/lib/api";
import type { Group } from "@/lib/domain";
import { useGroups } from "@/lib/hooks";

export default function GroupsPage() {
  const { data: groups = [], isLoading, refetch } = useGroups();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await action();
      await refetch();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    void run(() => createGroup({ name: name.trim(), description: description.trim() }));
    setName("");
    setDescription("");
  };

  const handleJoin = (event: FormEvent) => {
    event.preventDefault();
    if (!inviteCode.trim()) return;
    void run(() => joinGroup(inviteCode.trim()));
    setInviteCode("");
  };

  return (
    <Page>
      <PageHeader>
        <Eyebrow>Mesas e ligas</Eyebrow>
        <h1 className="font-display text-4xl uppercase leading-none">Seus grupos</h1>
        <p className="mt-2 max-w-xl text-sm text-primary-foreground/80">
          Escolha a liga da rodada, crie uma mesa nova ou entre com um código de convite.
        </p>
      </PageHeader>

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,0.9fr)_minmax(340px,0.62fr)] lg:items-start">
        <SectionCard title="Seus grupos" className="mt-0">
          {error && (
            <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          {isLoading && <p className="text-sm text-muted-foreground">Carregando grupos...</p>}
          {!isLoading && groups.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
              Nenhum grupo ainda. Crie uma liga para começar a registrar partidas.
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            {groups.map((group: Group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-foreground/10 bg-card p-3 shadow-[0_8px_0_rgba(23,73,56,0.06)] transition-transform hover:-translate-y-0.5 max-[520px]:grid-cols-[auto_minmax(0,1fr)]"
              >
                <PimbasAvatar
                  initials="P"
                  src={group.logoUrl}
                  alt={`Logo ${group.name}`}
                  size="default"
                />
                <div className="min-w-0">
                  <strong className="block truncate">{group.name}</strong>
                  <small className="block truncate text-muted-foreground">
                    {group.memberIds?.length || 0} membros - {group.description || "sem descrição"}
                  </small>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-black text-primary max-[520px]:col-start-2 max-[520px]:w-fit">
                  <Users className="size-3.5" />
                  Abrir
                </span>
              </Link>
            ))}
          </div>
        </SectionCard>

        <div className="grid gap-3.5">
          <SectionCard title="Criar grupo" className="mt-0">
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <FieldGroup>
                <Field data-invalid={!name.trim()}>
                  <FieldLabel htmlFor="group-name">Nome do grupo</FieldLabel>
                  <Input
                    id="group-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex: Pimbas do Trampo"
                    aria-invalid={!name.trim()}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="group-description">Descrição</FieldLabel>
                  <Input
                    id="group-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Grupo do pessoal do escritório"
                  />
                </Field>
              </FieldGroup>
              <Button type="submit" disabled={busy || !name.trim()}>
                Criar grupo
              </Button>
            </form>
          </SectionCard>

          <SectionCard title="Entrar com código" className="mt-0">
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <Field data-invalid={!inviteCode.trim()}>
                <FieldLabel htmlFor="invite-code">Código de convite</FieldLabel>
                <Input
                  id="invite-code"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                  placeholder="Ex: PIMBAS01"
                  aria-invalid={!inviteCode.trim()}
                />
              </Field>
              <Button type="submit" variant="secondary" disabled={busy || !inviteCode.trim()}>
                Entrar no grupo
              </Button>
            </form>
          </SectionCard>
        </div>
      </div>
    </Page>
  );
}
