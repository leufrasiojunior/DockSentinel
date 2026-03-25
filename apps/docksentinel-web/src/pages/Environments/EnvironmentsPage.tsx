import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Copy, KeyRound, Link2, Plus, RefreshCcw, Server, ShieldAlert, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PageHeader } from "../../components/product/page-header";
import { SectionCard } from "../../components/product/section-card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { buildEnvironmentPath, createRemoteEnvironment, deleteRemoteEnvironment, listEnvironments, rotateRemoteEnvironmentToken, testRemoteEnvironment, updateRemoteEnvironment, type Environment } from "../../features/environments/api/environments";
import { useConfirm } from "../../shared/components/ui/ConfirmProvider";
import { useToast } from "../../shared/components/ui/ToastProvider";
import { formatDateTime } from "../../i18n/format";

type Drafts = Record<string, { name: string; baseUrl: string }>;

function fmt(value?: string | null) {
  return value ? formatDateTime(value) ?? value : "—";
}

export function EnvironmentsPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [newName, setNewName] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [drafts, setDrafts] = useState<Drafts>({});
  const [commandByEnvironment, setCommandByEnvironment] = useState<Record<string, string>>({});

  const environmentsQuery = useQuery({
    queryKey: ["environments", "list"],
    queryFn: listEnvironments,
    retry: false,
  });

  const environments = environmentsQuery.data ?? [];

  const draftsByEnvironment = useMemo(() => {
    const next: Drafts = {};
    for (const environment of environments) {
      next[environment.id] = drafts[environment.id] ?? {
        name: environment.name,
        baseUrl: environment.baseUrl ?? "",
      };
    }
    return next;
  }, [drafts, environments]);

  const createMutation = useMutation({
    mutationFn: createRemoteEnvironment,
    onSuccess: async (data) => {
      setNewName("");
      setNewBaseUrl("");
      setCommandByEnvironment((current) => ({
        ...current,
        [data.environment.id]: data.installCommand,
      }));
      toast.success(t("environments.created"), t("navigation.environments"));
      await qc.invalidateQueries({ queryKey: ["environments", "list"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : String(error), t("navigation.environments"));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (input: { id: string; name?: string; baseUrl?: string }) =>
      updateRemoteEnvironment(input.id, {
        name: input.name,
        baseUrl: input.baseUrl,
      }),
    onSuccess: async () => {
      toast.success(t("environments.saved"), t("navigation.environments"));
      await qc.invalidateQueries({ queryKey: ["environments", "list"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : String(error), t("navigation.environments"));
    },
  });

  const testMutation = useMutation({
    mutationFn: testRemoteEnvironment,
    onSuccess: async () => {
      toast.success(t("environments.testSuccess"), t("navigation.environments"));
      await qc.invalidateQueries({ queryKey: ["environments", "list"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : String(error), t("navigation.environments"));
    },
  });

  const rotateMutation = useMutation({
    mutationFn: rotateRemoteEnvironmentToken,
    onSuccess: async (data) => {
      setCommandByEnvironment((current) => ({
        ...current,
        [data.environment.id]: data.installCommand,
      }));
      toast.success(t("environments.tokenRotated"), t("navigation.environments"));
      await qc.invalidateQueries({ queryKey: ["environments", "list"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : String(error), t("navigation.environments"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRemoteEnvironment,
    onSuccess: async () => {
      toast.success(t("environments.deleted"), t("navigation.environments"));
      await qc.invalidateQueries({ queryKey: ["environments", "list"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : String(error), t("navigation.environments"));
    },
  });

  function updateDraft(environment: Environment, patch: Partial<{ name: string; baseUrl: string }>) {
    setDrafts((current) => ({
      ...current,
      [environment.id]: {
        name: patch.name ?? draftsByEnvironment[environment.id]?.name ?? environment.name,
        baseUrl: patch.baseUrl ?? draftsByEnvironment[environment.id]?.baseUrl ?? environment.baseUrl ?? "",
      },
    }));
  }

  async function copyCommand(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("environments.commandCopied"), t("navigation.environments"));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : String(error), t("navigation.environments"));
    }
  }

  async function handleDelete(environment: Environment) {
    const ok = await confirm.confirm({
      title: t("environments.deleteTitle", { name: environment.name }),
      description: t("environments.deleteDescription"),
      confirmText: t("common.actions.delete"),
      cancelText: t("common.actions.cancel"),
    });
    if (!ok) return;
    deleteMutation.mutate(environment.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("navigation.environments")}
        title={t("environments.title")}
        description={t("environments.description")}
        actions={(
          <Button
            type="button"
            variant="outline"
            onClick={() => environmentsQuery.refetch()}
            disabled={environmentsQuery.isFetching}
          >
            <RefreshCcw className="size-4" />
            {t("common.actions.reload")}
          </Button>
        )}
      />

      <SectionCard
        title={t("environments.addTitle")}
        description={t("environments.addDescription")}
        actions={(
          <Button
            type="button"
            variant="primary"
            onClick={() => createMutation.mutate({ name: newName, baseUrl: newBaseUrl })}
            disabled={createMutation.isPending || !newName.trim() || !newBaseUrl.trim()}
          >
            <Plus className="size-4" />
            {t("environments.addAction")}
          </Button>
        )}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">{t("common.labels.name")}</div>
            <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Homelab" />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">{t("environments.urlLabel")}</div>
            <Input value={newBaseUrl} onChange={(event) => setNewBaseUrl(event.target.value)} placeholder="192.168.1.50" />
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {environments.map((environment) => {
          const draft = draftsByEnvironment[environment.id] ?? {
            name: environment.name,
            baseUrl: environment.baseUrl ?? "",
          };
          const installCommand = commandByEnvironment[environment.id];

          return (
            <Card key={environment.id} className="overflow-hidden p-0">
              <div className="border-b border-border/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-2xl border border-border/60 bg-muted/30 p-2">
                        <Server className="size-4" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-foreground">{environment.name}</div>
                        <div className="text-sm text-muted-foreground">{environment.kind === "local" ? t("environments.kindLocal") : t("environments.kindRemote")}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={environment.status === "online" ? "success" : "destructive"}>
                        {environment.status === "online" ? t("common.states.online") : t("common.states.offline")}
                      </Badge>
                      <Badge variant="outline">{environment.id}</Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => nav(buildEnvironmentPath(environment.id, "dashboard"))}
                    >
                      {t("environments.openAction")}
                      <ArrowRight className="size-4" />
                    </Button>
                    {environment.kind === "remote" ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => testMutation.mutate(environment.id)}
                        disabled={testMutation.isPending}
                      >
                        <Link2 className="size-4" />
                        {t("environments.testAction")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">{t("common.labels.name")}</div>
                    <Input
                      value={draft.name}
                      disabled={environment.kind === "local"}
                      onChange={(event) => updateDraft(environment, { name: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">{t("environments.urlLabel")}</div>
                    <Input
                      value={draft.baseUrl}
                      disabled={environment.kind === "local"}
                      onChange={(event) => updateDraft(environment, { baseUrl: event.target.value })}
                      placeholder="http://192.168.1.50:45873"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("environments.lastSeenLabel")}</div>
                    <div className="mt-2 text-foreground">{fmt(environment.lastSeenAt)}</div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("environments.versionsLabel")}</div>
                    <div className="mt-2 text-foreground">
                      Agent {environment.agentVersion ?? "—"} · Docker {environment.dockerVersion ?? "—"}
                    </div>
                  </div>
                </div>

                {environment.lastError ? (
                  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                    <div className="flex items-center gap-2 font-medium">
                      <ShieldAlert className="size-4" />
                      {t("environments.lastErrorLabel")}
                    </div>
                    <div className="mt-2">{environment.lastError}</div>
                  </div>
                ) : null}

                {environment.kind === "remote" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => saveMutation.mutate({ id: environment.id, ...draft })}
                      disabled={saveMutation.isPending}
                    >
                      {t("common.actions.save")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => rotateMutation.mutate(environment.id)}
                      disabled={rotateMutation.isPending}
                    >
                      <KeyRound className="size-4" />
                      {t("environments.rotateTokenAction")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDelete(environment)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-4" />
                      {t("common.actions.delete")}
                    </Button>
                  </div>
                ) : null}

                {installCommand ? (
                  <div className="space-y-3 rounded-[1.5rem] border border-border/60 bg-card/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{t("environments.installTitle")}</div>
                        <div className="text-sm text-muted-foreground">{t("environments.installDescription")}</div>
                      </div>
                      <Button type="button" variant="outline" onClick={() => copyCommand(installCommand)}>
                        <Copy className="size-4" />
                        {t("environments.copyCommand")}
                      </Button>
                    </div>

                    <pre className="overflow-x-auto rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs leading-relaxed text-foreground">
                      <code>{installCommand}</code>
                    </pre>

                    <div className="text-sm text-muted-foreground">
                      {t("environments.installWarning")}
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
