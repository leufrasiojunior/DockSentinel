import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { authApi } from "../api/auth";

export function ProtectedRoute() {
  const statusQ = useQuery({ queryKey: ["auth-status"], queryFn: authApi.status, retry: false });

  const mode = statusQ.data?.mode;
  const needsAuth = mode && mode !== "none";

  const meQ = useQuery({
    queryKey: ["auth-me"],
    queryFn: authApi.me,
    enabled: Boolean(needsAuth),
    retry: false,
  });

  if (statusQ.isLoading) return null;

  if (needsAuth) {
    if (meQ.isLoading) return null;
    if (meQ.isError) return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
