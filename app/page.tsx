"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/groups");
  }, [router]);
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="rounded-lg border border-foreground/10 bg-card p-5 text-center shadow-[0_14px_0_rgba(23,73,56,0.08),0_18px_34px_rgba(42,33,19,0.08)]">
        <p className="font-display text-2xl uppercase leading-none text-primary">Abrindo a mesa</p>
        <p className="mt-2 text-sm text-muted-foreground">Redirecionando para seus grupos...</p>
      </div>
    </main>
  );
}
