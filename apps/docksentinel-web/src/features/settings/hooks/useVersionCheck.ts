import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  getSystemVersionCheck,
  isAgentOutdated,
  type SystemVersionCheck,
} from "../api/settings";
import { useToast } from "../../../shared/components/ui/ToastProvider";
import { listEnvironments, type Environment } from "../../environments/api/environments";
import { copyToClipboard } from "../../../shared/lib/utils/copyToClipboard";

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
    onSuccess: async (data) => {
      qc.setQueryData(VERSION_CHECK_QUERY_KEY, data);

      // Checa se há algum ambiente remoto com agente desatualizado
      let envs = qc.getQueryData<Environment[]>(["environments"]);
      if (!envs) {
        try {
          envs = await listEnvironments();
          qc.setQueryData(["environments"], envs);
        } catch {
          envs = [];
        }
      }

      const outdated = (envs ?? []).filter(
        (e) =>
          e.kind === "remote" &&
          isAgentOutdated(e.agentVersion, data.agent.latestVersion),
      );

      if (outdated.length > 0 && data.agent.updateCommand) {
        toast.info(
          t("updatesCheck.agentUpdateToastMessage", {
            version: data.agent.latestVersion,
            environments: outdated.map((e) => e.name).join(", "),
          }),
          t("updatesCheck.agentUpdateToastTitle"),
          {
            label: t("updatesCheck.copyUpdateCommand"),
            onClick: async () => {
              try {
                await copyToClipboard(data.agent.updateCommand);
                toast.success(t("updatesCheck.agentUpdateCommandCopied"));
              } catch {
                toast.error("Falha ao copiar comando para a área de transferência");
              }
            },
          },
        );
      } else if (data.server.hasUpdate && data.server.latestVersion) {
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
