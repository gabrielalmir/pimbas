"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { Eyebrow, Page, SectionCard } from "@/components/PimbasLayout";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resetPassword, validateResetToken } from "@/lib/auth";

const MIN_PASSWORD_LENGTH = 8;
const INVALID_LINK_MESSAGE = "Este link de redefinição é inválido ou expirou.";

type TokenState = "checking" | "valid" | "invalid";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [tokenState, setTokenState] = useState<TokenState>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenState("invalid");
      return;
    }
    let active = true;
    void validateResetToken(token).then((valid) => {
      if (active) setTokenState(valid ? "valid" : "invalid");
    });
    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch {
      setError(INVALID_LINK_MESSAGE);
      setTokenState("invalid");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page className="grid content-center justify-items-center py-10">
      <div className="w-full max-w-md">
        <Eyebrow>Clube Pimbas</Eyebrow>
        <h1 className="font-display text-5xl uppercase leading-[0.92]">Redefinir senha</h1>

        <SectionCard title="Nova senha" className="mt-5">
          {tokenState === "checking" && <LoadingState />}

          {tokenState === "invalid" && (
            <div className="flex flex-col gap-4">
              <p className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {INVALID_LINK_MESSAGE}
              </p>
              <Link href="/forgot-password" className="font-bold text-primary">
                Solicitar um novo link
              </Link>
            </div>
          )}

          {tokenState === "valid" &&
            (done ? (
              <div className="flex flex-col gap-4">
                <p className="rounded-lg bg-muted p-3 text-sm font-medium">
                  Senha redefinida com sucesso. Você já pode entrar com a nova senha.
                </p>
                <Link href="/login" className="font-bold text-primary">
                  Ir para o login
                </Link>
              </div>
            ) : (
              <form
                className="flex flex-col gap-4"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmit();
                }}
              >
                {error && (
                  <p className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
                    {error}
                  </p>
                )}
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="password">Nova senha</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Mínimo de 8 caracteres"
                      autoComplete="new-password"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm">Confirmar senha</FieldLabel>
                    <Input
                      id="confirm"
                      type="password"
                      value={confirm}
                      onChange={(event) => setConfirm(event.target.value)}
                      placeholder="Repita a nova senha"
                      autoComplete="new-password"
                    />
                  </Field>
                </FieldGroup>
                <Button
                  type="submit"
                  className="h-12 w-full"
                  disabled={busy || !password || !confirm}
                >
                  Redefinir senha
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </form>
            ))}
        </SectionCard>
      </div>
    </Page>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
