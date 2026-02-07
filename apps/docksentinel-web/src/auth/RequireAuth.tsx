// src/auth/RequireAuth.tsx
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAuthStatus, me, type AuthMode } from "../api/auth";
import { ApiError } from "../api/http";

function FullscreenLoading({ text }: { text: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-sm text-gray-600">{text}</div>
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();

  // 1) Descobre modo
  const statusQuery = useQuery({
    queryKey: ["auth", "status"],
    queryFn: getAuthStatus,
    staleTime: 30_000,
    retry: false,
  });

  const mode: AuthMode | null = statusQuery.data?.authMode ?? null;
  const needsSession =
    mode === "password" || mode === "totp" || mode === "both";

  // ✅ hook sempre roda, mas só executa request quando precisa
  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: me,
    enabled: needsSession,
    staleTime: 10_000,
    retry: false,
  });
  // Loading geral
  if (statusQuery.isLoading) {
    return <FullscreenLoading text="Verificando modo de login..." />;
  }

  // Se /auth/status falhar, preferimos mandar pro login.
  if (statusQuery.isError || !mode) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // Modo none → libera tudo (agora pode ficar depois do hook)
  if (mode === "none") {
    return <>{children}</>;
  }

  if (meQuery.isLoading) {
    return <FullscreenLoading text="Verificando sessão..." />;
  }

  if (meQuery.isError) {
    const err = meQuery.error as ApiError;
    // 401 = não logado
    if (err?.status === 401) {
      return (
        <Navigate
          to="/login"
          replace
          state={{ from: location.pathname + location.search }}
        />
      );
    }
    // outros erros: também manda pro login (fallback)
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}
