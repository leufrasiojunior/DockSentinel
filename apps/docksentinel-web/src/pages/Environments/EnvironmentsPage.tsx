import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Copy,
  ExternalLink,
  KeyRound,
  Link2,
  LoaderCircle,
  Plus,
  RefreshCcw,
  Server,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PageHeader } from "../../components/product/page-header";
import { SectionCard } from "../../components/product/section-card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import {
  buildEnvironmentPath,
  completeRemoteEnvironmentRotation,
  createRemoteEnvironment,
  deleteRemoteEnvironment,
  getRemoteEnvironmentRotationStatus,
  listEnvironments,
  rotateRemoteEnvironmentToken,
  testRemoteEnvironment,
  updateRemoteEnvironment,
  type Environment,
  type EnvironmentRotationState,
} from "../../features/environments/api/environments";
import { formatDateTime } from "../../i18n/format";
import { useConfirm } from "../../shared/components/ui/ConfirmProvider";
import { useToast } from "../../shared/components/ui/ToastProvider";

type Drafts = Record<string, { name: string; baseUrl: string }>;
type InstallDialogState = {
  environmentId: string;
  environmentName: string;
  installCommand: string;
};
type RotationDialogState = {
  environmentId: string;
  environmentName: string;
  setupUrl?: string | null;
  bootstrapToken?: string | null;
};

function fmt(value?: string | null) {
  return value ? formatDateTime(value) ?? value : "—";
}

function buildSetupUrl(environment: Environment) {
  if (!environment.baseUrl) return null;
  return `${environment.baseUrl}/setup`;
}

function rotationBadgeVariant(state: EnvironmentRotationState) {
  switch (state) {
    case "ready_to_complete":
      return "info";
    case "pending_rotation":
      return "warning";
    case "unpaired":
      return "destructive";
    default:
      return "secondary";
  }
}

function rotationLabel(t: (key: any) => string, state: EnvironmentRotationState) {
  switch (state) {
    case "ready_to_complete":
      return t("environments.rotationReady");
    case "pending_rotation":
      return t("environments.rotationPending");
    case "unpaired":
      return t("environments.rotationUnpaired");
    default:
      return t("environments.rotationPaired");
  }
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
  const [installDialog, setInstallDialog] = useState<InstallDialogState | null>(null);
  const [rotationDialogOpen, setRotationDialogOpen] = useState(false);
  const [rotationSession, setRotationSession] = useState<RotationDialogState | null>(null);
  const [autoCompleteAttemptedFor, setAutoCompleteAttemptedFor] = useState<string | null>(null);

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

  const rotationEnvironment = rotationSession
    ? environments.find((item) => item.id === rotationSession.environmentId) ?? null
    : null;

  const rotationStatusQuery = useQuery({
    queryKey: ["environments", "rotation-status", rotationSession?.environmentId],
    queryFn: () => getRemoteEnvironmentRotationStatus(rotationSession!.environmentId),
    enabled: Boolean(rotationSession?.environmentId),
    retry: false,
    refetchInterval: (query) => (query.state.data?.readyToComplete ? false : 3000),
  });

  const createMutation = useMutation({
    mutationFn: createRemoteEnvironment,
    onSuccess: async (data) => {
      setNewName("");
      setNewBaseUrl("");
      setInstallDialog(
        data.installCommand
          ? {
              environmentId: data.environment.id,
              environmentName: data.environment.name,
              installCommand: data.installCommand,
            }
          : null,
      );
      toast.success(t("environments.created"), t("navigation.environments"));
      await qc.invalidateQueries({ queryKey: ["environments", "list"] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : String(error),
        t("navigation.environments"),
      );
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
      toast.error(
        error instanceof Error ? error.message : String(error),
        t("navigation.environments"),
      );
    },
  });

  const testMutation = useMutation({
    mutationFn: testRemoteEnvironment,
    onSuccess: async () => {
      toast.success(t("environments.testSuccess"), t("navigation.environments"));
      await qc.invalidateQueries({ queryKey: ["environments", "list"] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : String(error),
        t("navigation.environments"),
      );
    },
  });

  const rotateMutation = useMutation({
    mutationFn: rotateRemoteEnvironmentToken,
    onSuccess: async (data) => {
      setRotationSession({
        environmentId: data.environment.id,
        environmentName: data.environment.name,
        setupUrl: data.setupUrl ?? buildSetupUrl(data.environment),
        bootstrapToken: data.bootstrapToken ?? null,
      });
      setRotationDialogOpen(true);
      setAutoCompleteAttemptedFor(null);
      toast.success(t("environments.tokenRotated"), t("navigation.environments"));
      await qc.invalidateQueries({ queryKey: ["environments", "list"] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : String(error),
        t("navigation.environments"),
      );
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeRemoteEnvironmentRotation,
    onSuccess: async () => {
      toast.success(t("environments.rotationCompleted"), t("navigation.environments"));
      setRotationDialogOpen(false);
      setRotationSession(null);
      setAutoCompleteAttemptedFor(null);
      await qc.invalidateQueries({ queryKey: ["environments", "list"] });
      await qc.invalidateQueries({ queryKey: ["environments", "rotation-status"] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : String(error),
        t("navigation.environments"),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRemoteEnvironment,
    onSuccess: async () => {
      toast.success(t("environments.deleted"), t("navigation.environments"));
      await qc.invalidateQueries({ queryKey: ["environments", "list"] });
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : String(error),
        t("navigation.environments"),
      );
    },
  });

  useEffect(() => {
    if (!rotationSession?.environmentId) return;
    if (!rotationStatusQuery.data?.readyToComplete) return;
    if (completeMutation.isPending) return;
    if (autoCompleteAttemptedFor === rotationSession.environmentId) return;

    setAutoCompleteAttemptedFor(rotationSession.environmentId);
    completeMutation.mutate(rotationSession.environmentId);
  }, [
    autoCompleteAttemptedFor,
    completeMutation,
    rotationSession,
    rotationStatusQuery.data?.readyToComplete,
  ]);

  function updateDraft(
    environment: Environment,
    patch: Partial<{ name: string; baseUrl: string }>,
  ) {
    setDrafts((current) => ({
      ...current,
      [environment.id]: {
        name: patch.name ?? draftsByEnvironment[environment.id]?.name ?? environment.name,
        baseUrl:
          patch.baseUrl ??
          draftsByEnvironment[environment.id]?.baseUrl ??
          environment.baseUrl ??
          "",
      },
    }));
  }

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage, t("navigation.environments"));
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : String(error),
        t("navigation.environments"),
      );
    }
  }

  function openSetup(url?: string | null) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function closeRotationDialog() {
    setRotationDialogOpen(false);
    setRotationSession((current) =>
      current
        ? {
            ...current,
            bootstrapToken: null,
          }
        : null,
    );
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

  const liveRotationState =
    rotationStatusQuery.data?.agentState ??
    rotationEnvironment?.rotationState ??
    (rotationSession ? "pending_rotation" : null);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("navigation.environments")}
        title={t("environments.title")}
        description={t("environments.description")}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => environmentsQuery.refetch()}
            disabled={environmentsQuery.isFetching}
          >
            <RefreshCcw className="size-4" />
            {t("common.actions.reload")}
          </Button>
        }
      />

      <SectionCard
        title={t("environments.addTitle")}
        description={t("environments.addDescription")}
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={() => createMutation.mutate({ name: newName, baseUrl: newBaseUrl })}
            disabled={createMutation.isPending || !newName.trim() || !newBaseUrl.trim()}
          >
            <Plus className="size-4" />
            {t("environments.addAction")}
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">{t("common.labels.name")}</div>
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Homelab"
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">
              {t("environments.urlLabel")}
            </div>
            <Input
              value={newBaseUrl}
              onChange={(event) => setNewBaseUrl(event.target.value)}
              placeholder="192.168.1.50"
            />
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {environments.map((environment) => {
          const draft = draftsByEnvironment[environment.id] ?? {
            name: environment.name,
            baseUrl: environment.baseUrl ?? "",
          };
          const setupUrl = buildSetupUrl(environment);
          const showInstallActions =
            environment.kind === "remote" && environment.rotationState === "unpaired";
          const showRotationActions =
            environment.kind === "remote" &&
            (environment.rotationState === "pending_rotation" ||
              environment.rotationState === "ready_to_complete");

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
                        <div className="text-lg font-semibold text-foreground">
                          {environment.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {environment.kind === "local"
                            ? t("environments.kindLocal")
                            : t("environments.kindRemote")}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={environment.status === "online" ? "success" : "destructive"}
                      >
                        {environment.status === "online"
                          ? t("common.states.online")
                          : t("common.states.offline")}
                      </Badge>
                      {environment.kind === "remote" ? (
                        <Badge variant={rotationBadgeVariant(environment.rotationState)}>
                          {rotationLabel(t, environment.rotationState)}
                        </Badge>
                      ) : null}
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
                    <div className="text-sm font-medium text-foreground">
                      {t("common.labels.name")}
                    </div>
                    <Input
                      value={draft.name}
                      disabled={environment.kind === "local"}
                      onChange={(event) => updateDraft(environment, { name: event.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">
                      {t("environments.urlLabel")}
                    </div>
                    <Input
                      value={draft.baseUrl}
                      disabled={environment.kind === "local"}
                      onChange={(event) =>
                        updateDraft(environment, { baseUrl: event.target.value })
                      }
                      placeholder="http://192.168.1.50:45873"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {t("environments.lastSeenLabel")}
                    </div>
                    <div className="mt-2 text-foreground">{fmt(environment.lastSeenAt)}</div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {t("environments.versionsLabel")}
                    </div>
                    <div className="mt-2 text-foreground">
                      Agent {environment.agentVersion ?? "—"} · Docker{" "}
                      {environment.dockerVersion ?? "—"}
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

                {showInstallActions ? (
                  <div className="rounded-[1.5rem] border border-border/60 bg-muted/20 p-4">
                    <div className="text-sm font-semibold text-foreground">
                      {t("environments.installStatusTitle")}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {t("environments.installStatusPending")}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => testMutation.mutate(environment.id)}
                        disabled={testMutation.isPending}
                      >
                        <Link2 className="size-4" />
                        {t("environments.confirmInstallAction")}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {showRotationActions ? (
                  <div className="rounded-[1.5rem] border border-border/60 bg-muted/20 p-4">
                    <div className="text-sm font-semibold text-foreground">
                      {t("environments.rotationStatusTitle")}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {environment.rotationState === "ready_to_complete"
                        ? t("environments.rotationStatusReady")
                        : t("environments.rotationStatusPending")}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openSetup(setupUrl)}
                        disabled={!setupUrl}
                      >
                        <ExternalLink className="size-4" />
                        {t("environments.openSetupAction")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => completeMutation.mutate(environment.id)}
                        disabled={completeMutation.isPending}
                      >
                        {completeMutation.isPending ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : null}
                        {t("environments.completeRotationAction")}
                      </Button>
                    </div>
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
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={Boolean(installDialog)}
        onOpenChange={(open) => (!open ? setInstallDialog(null) : undefined)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("environments.installTitle")}</DialogTitle>
            <DialogDescription>
              {installDialog
                ? t("environments.installDialogDescription", {
                    name: installDialog.environmentName,
                  })
                : t("environments.installDescription")}
            </DialogDescription>
          </DialogHeader>

          {installDialog ? (
            <div className="space-y-3 px-6 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {t("environments.installWarning")}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    copyText(installDialog.installCommand, t("environments.commandCopied"))
                  }
                >
                  <Copy className="size-4" />
                  {t("environments.copyCommand")}
                </Button>
              </div>
              <pre className="overflow-x-auto rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs leading-relaxed text-foreground">
                <code>{installDialog.installCommand}</code>
              </pre>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInstallDialog(null)}>
              {t("common.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rotationDialogOpen} onOpenChange={(open) => (!open ? closeRotationDialog() : undefined)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("environments.rotationDialogTitle")}</DialogTitle>
            <DialogDescription>
              {rotationSession
                ? t("environments.rotationDialogDescription", {
                    name: rotationSession.environmentName,
                  })
                : t("environments.rotationDialogDescription", { name: "" })}
            </DialogDescription>
          </DialogHeader>

          {rotationSession ? (
            <div className="space-y-4 px-6 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={rotationBadgeVariant(
                    (liveRotationState as EnvironmentRotationState | null) ?? "pending_rotation",
                  )}
                >
                  {rotationLabel(
                    t,
                    (liveRotationState as EnvironmentRotationState | null) ?? "pending_rotation",
                  )}
                </Badge>
                {rotationStatusQuery.isFetching ? (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" />
                    {t("environments.rotationPolling")}
                  </span>
                ) : null}
              </div>

              <div className="rounded-[1.5rem] border border-border/60 bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {t("environments.rotationTokenTitle")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("environments.rotationTokenHint")}
                    </div>
                  </div>
                  {rotationSession.bootstrapToken ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        copyText(
                          rotationSession.bootstrapToken ?? "",
                          t("environments.rotationTokenCopied"),
                        )
                      }
                    >
                      <Copy className="size-4" />
                      {t("environments.copyCommand")}
                    </Button>
                  ) : null}
                </div>

                {rotationSession.bootstrapToken ? (
                  <pre className="mt-3 overflow-x-auto rounded-2xl border border-border/60 bg-background/80 p-4 text-xs leading-relaxed text-foreground">
                    <code>{rotationSession.bootstrapToken}</code>
                  </pre>
                ) : (
                  <div className="mt-3 text-sm text-muted-foreground">
                    {t("environments.rotationTokenHidden")}
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-border/60 bg-muted/20 p-4 text-sm">
                <div className="font-semibold text-foreground">
                  {t("environments.rotationNextStepTitle")}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {rotationStatusQuery.data?.readyToComplete
                    ? t("environments.rotationReadyHint")
                    : t("environments.rotationPendingHint")}
                </div>
                {rotationStatusQuery.error instanceof Error ? (
                  <div className="mt-3 text-destructive">
                    {rotationStatusQuery.error.message}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => openSetup(rotationSession?.setupUrl)}
              disabled={!rotationSession?.setupUrl}
            >
              <ExternalLink className="size-4" />
              {t("environments.openSetupAction")}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() =>
                rotationSession
                  ? completeMutation.mutate(rotationSession.environmentId)
                  : undefined
              }
              disabled={!rotationSession || completeMutation.isPending}
            >
              {completeMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              {t("environments.completeRotationAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
