import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Eyebrow } from "@/components/PimbasLayout";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-4">
      <section className="w-full max-w-xl rounded-lg border border-foreground/10 bg-card p-6 text-center shadow-[0_14px_0_rgba(23,73,56,0.08),0_18px_34px_rgba(42,33,19,0.08)]">
        <Eyebrow>Fora da mesa</Eyebrow>
        <h1 className="font-display text-5xl uppercase leading-none text-primary">
          Página não encontrada
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          O link não corresponde a uma partida, grupo ou torneio disponível.
        </p>
        <Link
          href="/groups"
          className={buttonVariants({
            variant: "secondary",
            className: "mt-5",
          })}
        >
          <ArrowLeft data-icon="inline-start" />
          Voltar para grupos
        </Link>
      </section>
    </main>
  );
}
