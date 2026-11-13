import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  getSystemVersionCheck,
  type SystemVersionCheck,
} from "../api/settings";
import { useToast } from "../../../shared/components/ui/ToastProvider";

export const VERSION_CHECK_QUERY_KEY = ["settings", "version-check"] as const;

export function useVersionCheck() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();

  const query = useQuery<SystemVersionCheck>({
    queryKey: VERSION_CHECK_QUERY_KEY,
    queryFn: () => getSystemVersionCheck(false),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const refreshMutation = useMutation({
    mutationFn: () => getSystemVersionCheck(true),
    onSuccess: (data) => {
      qc.setQueryData(VERSION_CHECK_QUERY_KEY, data);
      if (data.server.hasUpdate && data.server.latestVersion) {
        toast.info(
          t("updatesCheck.newServerVersionToast", {
            version: data.server.latestVersion,
          }),
          "DockSentinel",
        );
      } else {
        toast.success(
          t("updatesCheck.upToDateToast", {
            version: data.server.currentVersion,
          }),
          "DockSentinel",
        );
      }
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : String(err),
        "DockSentinel",
      );
    },
  });

  return {
    versionCheck: query.data ?? null,
    isLoading: query.isLoading,
    isRefreshing: refreshMutation.isPending || query.isFetching,
    refreshVersions: () => refreshMutation.mutate(),
  };
}
