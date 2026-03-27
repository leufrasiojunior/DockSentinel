import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock3,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  LoaderCircle,
  Plus,
  RefreshCcw,
  Server,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import type { TFunction } from "i18next";
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
  completeRemoteEnvironmentSetup,
  createRemoteEnvironment,
  deleteRemoteEnvironment,
  getRemoteEnvironmentSetupStatus,
  listEnvironments,
  reportRemoteEnvironmentSetupTimeout,
  rotateRemoteEnvironmentToken,
  testRemoteEnvironment,
  updateRemoteEnvironment,
  type Environment,
  type EnvironmentSetupPhase,
  type EnvironmentRotationState,
} from "../../features/environments/api/environments";
import { formatDateTime } from "../../i18n/format";
import { useConfirm } from "../../shared/components/ui/ConfirmProvider";
import { useToast } from "../../shared/components/ui/ToastProvider";

type Drafts = Record<string, { name: string; baseUrl: string }>;
type SetupFlow = "install" | "rotation";
type SetupWizardStep = 1 | 2 | 3;
type SetupDialogState = {
  environmentId: string;
  environmentName: string;
  flow: SetupFlow;
  installCommand?: string | null;
  setupUrl?: string | null;
  bootstrapToken?: string | null;
  tokenVisible: boolean;
  expiresAt: number;
};

const SETUP_TIMEOUT_MS = 120_000;
const SETUP_POLL_INTERVAL_MS = 3_000;
const MANUAL_CLEANUP_COMMANDS = [
  "docker rm -f docksentinel-agent",
  "sudo rm -rf /opt/docksentinel-agent",
].join("\n");

function fmt(value?: string | null) {
  return value ? formatDateTime(value) ?? value : "—";
}

function buildSetupUrl(environment: Environment) {
  if (!environment.baseUrl) return null;
  return `${environment.baseUrl}/setup`;
}

function buildSetupLaunchUrl(url?: string | null, bootstrapToken?: string | null) {
  if (!url) return null;
  if (!bootstrapToken) return url;
  const hash = new URLSearchParams({ bootstrapToken }).toString();
  return `${url}#${hash}`;
}

function rotationBadgeVariant(state: EnvironmentRotationState) {
  switch (state) {
    case "ready_to_complete":
      return "info";
    case "pending_rotation":
    case "ready_to_pair":
      return "warning";
    case "unpaired":
      return "destructive";
    default:
      return "secondary";
  }
}

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function rotationLabel(t: TFunction, state: EnvironmentRotationState) {
  switch (state) {
    case "ready_to_complete":
      return t("environments.rotationReady");
    case "pending_rotation":
      return t("environments.rotationPending");
    case "ready_to_pair":
      return t("environments.rotationReadyToPair");
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
  const [setupDialog, setSetupDialog] = useState<SetupDialogState | null>(null);
  const [wizardStep, setWizardStep] = useState<SetupWizardStep>(1);
  const [autoCompleteAttemptedFor, setAutoCompleteAttemptedFor] = useState<string | null>(null);
  const [timeoutReportedFor, setTimeoutReportedFor] = useState<string | null>(null);
  const [hasSeenReachableAgent, setHasSeenReachableAgent] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

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

  const setupStatusQuery = useQuery({
    queryKey: ["environments", "setup-status", setupDialog?.environmentId],
    queryFn: () => getRemoteEnvironmentSetupStatus(setupDialog!.environmentId),
    enabled: Boolean(setupDialog?.environmentId),
    retry: false,
    refetchInterval: (query) => {
      if (!setupDialog) return false;
      return query.state.data?.phase === "blocked" ? false : SETUP_POLL_INTERVAL_MS;
    },
  });

  const liveEnvironment =
    setupDialog
      ? environments.find((item) => item.id === setupDialog.environmentId) ?? null
      : null;

  const countdownMs = setupDialog ? Math.max(0, setupDialog.expiresAt - nowMs) : 0;

  const createMutation = useMutation({
    mutationFn: createRemoteEnvironment,
    onSuccess: async (data) => {
      setNewName("");
      setNewBaseUrl("");
      setAutoCompleteAttemptedFor(null);
      setTimeoutReportedFor(null);
      setHasSeenReachableAgent(false);
      setSetupDialog({
        environmentId: data.environment.id,
        environmentName: data.environment.name,
        flow: "install",
        installCommand: data.installCommand ?? null,
        setupUrl: data.setupUrl ?? buildSetupUrl(data.environment),
        bootstrapToken: data.bootstrapToken ?? null,
        tokenVisible: false,
        expiresAt: Date.now() + SETUP_TIMEOUT_MS,
      });
      setWizardStep(1);
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
      setAutoCompleteAttemptedFor(null);
      setTimeoutReportedFor(null);
      setHasSeenReachableAgent(false);
      setSetupDialog({
        environmentId: data.environment.id,
        environmentName: data.environment.name,
        flow: "rotation",
        installCommand: data.installCommand ?? null,
        setupUrl: data.setupUrl ?? buildSetupUrl(data.environment),
        bootstrapToken: data.bootstrapToken ?? null,
        tokenVisible: false,
        expiresAt: Date.now() + SETUP_TIMEOUT_MS,
      });
      setWizardStep(2);
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
    mutationFn: async (input: { id: string; flow: SetupFlow }) =>
      completeRemoteEnvironmentSetup(input.id),
    onSuccess: async (_, variables) => {
      closeSetupDialog({ preserveEnvironment: true });
      toast.success(
        variables.flow === "rotation"
          ? t("environments.rotationCompleted")
          : t("environments.setupCompleted"),
        t("navigation.environments"),
      );
      await qc.invalidateQueries({ queryKey: ["environments", "list"] });
      await qc.invalidateQueries({ queryKey: ["environments", "setup-status"] });
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      nav("/home");
    },
    onError: async (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      closeSetupDialog();
      toast.error(message, t("navigation.environments"));
      await qc.invalidateQueries({ queryKey: ["environments", "list"] });
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const timeoutMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      flow: SetupFlow;
      lastError?: string;
    }) =>
      reportRemoteEnvironmentSetupTimeout(input.id, {
        flow: input.flow,
        lastError: input.lastError,
      }),
    onSuccess: async (_, variables) => {
      toast.error(
        variables.flow === "rotation"
          ? t("environments.rotationTimeoutMessage")
          : t("environments.setupTimeoutMessage"),
        t("navigation.environments"),
      );
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      await qc.invalidateQueries({ queryKey: ["environments", "list"] });
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
    const phase = setupStatusQuery.data?.phase;
    if (!phase || phase === "waiting_for_agent") return;
    setHasSeenReachableAgent(true);
  }, [setupStatusQuery.data?.phase]);

  useEffect(() => {
    if (!setupDialog) return undefined;
    if (setupStatusQuery.data?.phase === "blocked") return undefined;

    setNowMs(Date.now());
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, [setupDialog, setupStatusQuery.data?.phase]);

  useEffect(() => {
    if (!setupDialog?.environmentId) return;
    if (!setupStatusQuery.data?.readyToComplete) return;
    if (completeMutation.isPending) return;
    if (setupStatusQuery.data.phase === "blocked") return;
    if (autoCompleteAttemptedFor === setupDialog.environmentId) return;

    setWizardStep(3);
    setAutoCompleteAttemptedFor(setupDialog.environmentId);
    completeMutation.mutate({
      id: setupDialog.environmentId,
      flow: setupDialog.flow,
    });
  }, [
    autoCompleteAttemptedFor,
    completeMutation,
    setupDialog,
    setupStatusQuery.data?.readyToComplete,
  ]);

  useEffect(() => {
    if (!setupDialog?.environmentId) return;
    if (completeMutation.isPending) return;
    if (setupStatusQuery.data?.phase === "blocked") return;
    if (countdownMs > 0) return;
    if (timeoutReportedFor === setupDialog.environmentId) return;

    const lastError =
      setupStatusQuery.data?.lastError ??
      (setupStatusQuery.error instanceof Error ? setupStatusQuery.error.message : undefined);

    setTimeoutReportedFor(setupDialog.environmentId);
    timeoutMutation.mutate({
      id: setupDialog.environmentId,
      flow: setupDialog.flow,
      lastError,
    });
    closeSetupDialog();
  }, [
    countdownMs,
    setupDialog,
    setupStatusQuery.data?.lastError,
    setupStatusQuery.error,
    completeMutation.isPending,
    timeoutMutation,
    timeoutReportedFor,
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

  async function discardPendingInstall(environmentId: string) {
    try {
      await deleteRemoteEnvironment(environmentId);
      await qc.invalidateQueries({ queryKey: ["environments", "list"] });
      await qc.invalidateQueries({ queryKey: ["environments", "overview"] });
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : String(error),
        t("navigation.environments"),
      );
    }
  }

  function openSetup(url?: string | null, bootstrapToken?: string | null) {
    const launchUrl = buildSetupLaunchUrl(url, bootstrapToken);
    if (!launchUrl) return;
    setWizardStep(3);
    window.open(launchUrl, "_blank", "noopener,noreferrer");
  }

  function closeSetupDialog(options?: { preserveEnvironment?: boolean }) {
    const current = setupDialog;
    setSetupDialog(null);
    setWizardStep(1);
    setAutoCompleteAttemptedFor(null);
    setTimeoutReportedFor(null);
    setHasSeenReachableAgent(false);

    if (!options?.preserveEnvironment && current?.flow === "install") {
      void discardPendingInstall(current.environmentId);
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

  const liveRotationState =
    setupStatusQuery.data?.agentState ??
    liveEnvironment?.rotationState ??
    (setupDialog?.flow === "rotation" ? "pending_rotation" : "ready_to_pair");

  const setupPhase: EnvironmentSetupPhase =
    setupStatusQuery.data?.phase ?? "waiting_for_agent";
  const setupIsBlocked = setupPhase === "blocked";
  const setupStatusError =
    setupIsBlocked ||
    hasSeenReachableAgent ||
    (setupStatusQuery.error instanceof Error && setupPhase !== "waiting_for_agent")
      ? setupStatusQuery.data?.lastError ??
        (setupStatusQuery.error instanceof Error ? setupStatusQuery.error.message : null)
      : null;
  const setupHint =
    setupIsBlocked
      ? t("environments.setupBlockedHint")
      : setupPhase === "ready_to_complete"
        ? setupDialog?.flow === "rotation"
          ? t("environments.rotationReadyHint")
          : t("environments.setupReadyHint")
        : setupPhase === "waiting_for_token"
          ? setupDialog?.flow === "rotation"
            ? t("environments.rotationPendingHint")
            : t("environments.setupPendingHint")
          : t("environments.setupWaitingForAgentHint");
  const showCleanupBlock = Boolean(setupDialog && setupIsBlocked);
  const showCompactErrorState = setupIsBlocked;
  const initialWizardStep: SetupWizardStep = setupDialog?.flow === "rotation" ? 2 : 1;
  const effectiveWizardStep: SetupWizardStep =
    setupDialog?.flow === "rotation" ? Math.max(2, wizardStep) as SetupWizardStep : wizardStep;
  const wizardSteps: Array<{
    key: SetupWizardStep;
    label: string;
    enabled: boolean;
  }> = [
    {
      key: 1,
      label: t("environments.wizardInstallStep"),
      enabled: setupDialog?.flow !== "rotation",
    },
    {
      key: 2,
      label: t("environments.wizardSetupStep"),
      enabled: true,
    },
    {
      key: 3,
      label: t("environments.wizardFinishStep"),
      enabled: true,
    },
  ];

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
            environment.kind === "remote" &&
            (environment.rotationState === "unpaired" ||
              environment.rotationState === "ready_to_pair");
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
                        disabled={testMutation.isPending || !environment.hasToken}
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
                        onClick={() => openSetup(setupUrl)}
                        disabled={!setupUrl}
                      >
                        <ExternalLink className="size-4" />
                        {t("environments.openSetupAction")}
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

      <Dialog open={Boolean(setupDialog)} onOpenChange={(open) => (!open ? closeSetupDialog() : undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {setupDialog?.flow === "rotation"
                ? t("environments.rotationDialogTitle")
                : t("environments.installTitle")}
            </DialogTitle>
            <DialogDescription>
              {setupDialog?.flow === "rotation"
                ? t("environments.rotationDialogDescription", {
                    name: setupDialog.environmentName,
                  })
                : t("environments.installDialogDescription", {
                    name: setupDialog?.environmentName ?? "",
                  })}
            </DialogDescription>
          </DialogHeader>

          {setupDialog ? (
            <div className="space-y-4 px-6 pb-2">
              <div className="grid gap-2 sm:grid-cols-3">
                {wizardSteps.map((step) => {
                  const isActive = !showCompactErrorState && effectiveWizardStep === step.key;
                  const isComplete = !showCompactErrorState && effectiveWizardStep > step.key;
                  const isDisabled = !step.enabled;

                  return (
                    <div
                      key={step.key}
                      className={[
                        "rounded-2xl border px-4 py-3 text-left",
                        isActive
                          ? "border-primary/40 bg-primary/10"
                          : isComplete
                            ? "border-border/60 bg-muted/20"
                            : "border-border/40 bg-background/70",
                        isDisabled ? "opacity-50" : "",
                      ].join(" ")}
                    >
                      <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        {step.key}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {step.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {showCompactErrorState ? (
                <div className="space-y-4 rounded-[1.5rem] border border-destructive/30 bg-destructive/10 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl border border-destructive/30 bg-background/80 p-2 text-destructive">
                      <ShieldAlert className="size-4" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-foreground">
                        {t("environments.setupBlockedTitle")}
                      </div>
                      <div className="text-sm text-muted-foreground">{setupHint}</div>
                    </div>
                  </div>

                  {setupStatusError ? (
                    <div className="rounded-2xl border border-destructive/30 bg-background/80 p-4 text-sm text-destructive">
                      {setupStatusError}
                    </div>
                  ) : null}

                  {showCleanupBlock ? (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {t("environments.cleanupTitle")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("environments.cleanupBlockedHint")}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            copyText(
                              MANUAL_CLEANUP_COMMANDS,
                              t("environments.cleanupCopied"),
                            )
                          }
                        >
                          <Copy className="size-4" />
                          {t("environments.copyCleanupAction")}
                        </Button>
                      </div>
                      <pre className="mt-3 overflow-x-auto rounded-2xl border border-border/60 bg-background/80 p-4 text-xs leading-relaxed text-foreground">
                        <code>{MANUAL_CLEANUP_COMMANDS}</code>
                      </pre>
                    </div>
                  ) : null}
                </div>
              ) : effectiveWizardStep === 1 ? (
                <div className="space-y-4 rounded-[1.5rem] border border-border/60 bg-muted/20 p-5">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">
                      {t("environments.installTitle")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("environments.installStepHint")}
                    </div>
                  </div>

                  {setupDialog.installCommand ? (
                    <>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            copyText(
                              setupDialog.installCommand ?? "",
                              t("environments.commandCopied"),
                            )
                          }
                        >
                          <Copy className="size-4" />
                          {t("environments.copyCommand")}
                        </Button>
                      </div>
                      <pre className="overflow-x-auto rounded-2xl border border-border/60 bg-background/80 p-4 text-xs leading-relaxed text-foreground">
                        <code>{setupDialog.installCommand}</code>
                      </pre>
                    </>
                  ) : null}

                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4 text-sm text-muted-foreground">
                    {t("environments.installWarning")}
                  </div>
                </div>
              ) : effectiveWizardStep === 2 ? (
                <div className="space-y-4 rounded-[1.5rem] border border-border/60 bg-muted/20 p-5">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">
                      {t("environments.wizardSetupStep")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("environments.rotationTokenHint")}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">
                        {t("environments.rotationTokenTitle")}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setSetupDialog((current) =>
                              current ? { ...current, tokenVisible: !current.tokenVisible } : current,
                            )
                          }
                          disabled={!setupDialog.bootstrapToken}
                        >
                          {setupDialog.tokenVisible ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                          {setupDialog.tokenVisible
                            ? t("environments.hideTokenAction")
                            : t("environments.revealTokenAction")}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            copyText(
                              setupDialog.bootstrapToken ?? "",
                              t("environments.rotationTokenCopied"),
                            )
                          }
                          disabled={!setupDialog.bootstrapToken}
                        >
                          <Copy className="size-4" />
                          {t("environments.copyTokenAction")}
                        </Button>
                      </div>
                    </div>

                    {setupDialog.bootstrapToken ? (
                      setupDialog.tokenVisible ? (
                        <pre className="mt-3 overflow-x-auto rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs leading-relaxed text-foreground">
                          <code>{setupDialog.bootstrapToken}</code>
                        </pre>
                      ) : (
                        <div className="mt-3 text-sm text-muted-foreground">
                          {t("environments.rotationTokenHidden")}
                        </div>
                      )
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() =>
                        openSetup(setupDialog.setupUrl, setupDialog.bootstrapToken ?? null)
                      }
                      disabled={!setupDialog.setupUrl}
                    >
                      <ExternalLink className="size-4" />
                      {t("environments.openSetupCta")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        copyText(
                          setupDialog.setupUrl ?? "",
                          t("environments.setupUrlCopied"),
                        )
                      }
                      disabled={!setupDialog.setupUrl}
                    >
                      <Copy className="size-4" />
                      {t("environments.copySetupUrlAction")}
                    </Button>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {t("environments.setupManualHint")}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 rounded-[1.5rem] border border-border/60 bg-muted/20 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-foreground">
                        {t("environments.wizardFinishStep")}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={rotationBadgeVariant(
                            (liveRotationState as EnvironmentRotationState | null) ??
                              "ready_to_pair",
                          )}
                        >
                          {rotationLabel(
                            t,
                            (liveRotationState as EnvironmentRotationState | null) ??
                              "ready_to_pair",
                          )}
                        </Badge>
                        {(setupStatusQuery.isFetching || completeMutation.isPending) ? (
                          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <LoaderCircle className="size-4 animate-spin" />
                            {t("environments.rotationPolling")}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm font-semibold text-foreground">
                      <Clock3 className="size-4" />
                      {t("environments.setupTimerLabel", {
                        time: formatCountdown(countdownMs),
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/80 p-4 text-sm text-muted-foreground">
                    {setupHint}
                  </div>

                  {setupStatusError ? (
                    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                      {setupStatusError}
                    </div>
                  ) : setupPhase === "waiting_for_agent" ? (
                    <div className="rounded-2xl border border-border/60 bg-background/80 p-4 text-sm text-muted-foreground">
                      {t("environments.setupWaitingForAgentMessage")}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            {setupDialog && !showCompactErrorState && effectiveWizardStep > initialWizardStep ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setWizardStep((current) =>
                    Math.max(initialWizardStep, current - 1) as SetupWizardStep,
                  )
                }
              >
                {t("common.actions.back")}
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => closeSetupDialog()}>
              {t("common.actions.close")}
            </Button>
            {setupDialog && !showCompactErrorState && effectiveWizardStep === 1 ? (
              <Button type="button" variant="primary" onClick={() => setWizardStep(2)}>
                {t("environments.installRanAction")}
              </Button>
            ) : null}
            {setupDialog && !showCompactErrorState && effectiveWizardStep === 3 ? (
              <Button
                type="button"
                variant="primary"
                onClick={() =>
                  setupDialog
                    ? completeMutation.mutate({
                        id: setupDialog.environmentId,
                        flow: setupDialog.flow,
                      })
                    : undefined
                }
                disabled={
                  !setupDialog ||
                  setupIsBlocked ||
                  completeMutation.isPending ||
                  !setupStatusQuery.data?.readyToComplete
                }
              >
                {completeMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                {t("environments.completeSetupAction")}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
