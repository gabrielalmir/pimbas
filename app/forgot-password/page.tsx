"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Eyebrow, Page, SectionCard } from "@/components/PimbasLayout";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError("Informe um e-mail válido.");
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch {
      // Avoid user enumeration: show the same neutral confirmation on failure.
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page className="grid content-center justify-items-center py-10">
      <div className="w-full max-w-md">
        <Eyebrow>Clube Pimbas</Eyebrow>
        <h1 className="font-display text-5xl uppercase leading-[0.92]">Recuperar acesso</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Informe o e-mail da sua conta e enviaremos um link para redefinir a senha.
        </p>

        <SectionCard title="Esqueceu a senha?" className="mt-5">
          {sent ? (
            <div className="flex flex-col gap-4">
              <p className="rounded-lg bg-muted p-3 text-sm font-medium">
                Se esse e-mail estiver cadastrado, você receberá um link de redefinição em
                instantes. Verifique sua caixa de entrada e o spam.
              </p>
              <Link href="/login" className="font-bold text-primary">
                Voltar para o login
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
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="você@time.com"
                    autoComplete="email"
                  />
                </Field>
              </FieldGroup>
              <Button type="submit" className="h-12 w-full" disabled={busy || !email.trim()}>
                Enviar link
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Link href="/login" className="text-center text-sm font-medium text-muted-foreground">
                Voltar para o login
              </Link>
            </form>
          )}
        </SectionCard>
      </div>
    </Page>
  );
}
