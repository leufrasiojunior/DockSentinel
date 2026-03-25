import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";

const STORAGE_KEY = "docksentinel.environment.current";

export function getEnvironmentIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/environments\/([^/]+)\//);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function readStoredEnvironmentId() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function writeStoredEnvironmentId(environmentId: string) {
  try {
    window.localStorage.setItem(STORAGE_KEY, environmentId);
  } catch {
    // keep session-only fallback
  }
}

export function useEnvironmentRoute() {
  const params = useParams();
  const location = useLocation();

  return useMemo(() => {
    const routeEnvironmentId =
      typeof params.environmentId === "string" && params.environmentId.length > 0
        ? params.environmentId
        : null;
    const pathEnvironmentId = getEnvironmentIdFromPathname(location.pathname);
    const environmentId = routeEnvironmentId ?? pathEnvironmentId ?? "local";

    return {
      environmentId,
      isEnvironmentScoped: Boolean(routeEnvironmentId ?? pathEnvironmentId),
    };
  }, [location.pathname, params.environmentId]);
}
