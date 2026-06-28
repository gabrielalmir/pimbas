"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useAuth } from "@/app/AuthContext";
import { LoadingState } from "./LoadingState";

// Portao de autenticacao das rotas protegidas: redireciona para /login ou
// /profile-onboarding via router (em vez de renderizar paginas como componentes,
// o que quebra o boundary client/server do Next).
export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
    if (status === "needs-profile") router.replace("/profile-onboarding");
  }, [status, router]);

  if (status === "ready") return <>{children}</>;
  return <LoadingState />;
}
