import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, LoaderCircle, Pencil, Plus, Server, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "../../../components/product/empty-state";
import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";
import { Card, CardContent, CardHeader } from "../../../shared/components/ui/Card";
import { Input } from "../../../shared/components/ui/Input";
import { useConfirm } from "../../../shared/components/ui/ConfirmProvider";
import { useToast } from "../../../shared/components/ui/ToastProvider";
import {
  createRegistry,
  deleteRegistry,
  listRegistries,
  updateRegistry,
  type RegistryCredential,
} from "../api/settings";

const REGISTRY_PRESETS = [
  { label: "Docker Hub", name: "Docker Hub", serverAddress: "index.docker.io" },
  { label: "GitHub (GHCR)", name: "GitHub Container Registry", serverAddress: "ghcr.io" },
  { label: "LinuxServer (lscr.io)", name: "LinuxServer.io", serverAddress: "lscr.io" },
  { label: "Quay.io", name: "Red Hat Quay", serverAddress: "quay.io" },
  { label: "GitLab Registry", name: "GitLab Container Registry", serverAddress: "registry.gitlab.com" },
] as const;

export function RegistrySettings() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("Docker Hub");
  const [serverAddress, setServerAddress] = useState("index.docker.io");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [enabled, setEnabled] = useState(true);

  const registriesQuery = useQuery({
    queryKey: ["settings", "registries"],
    queryFn: listRegistries,
  });

  const registries = registriesQuery.data ?? [];

  function resetForm() {
    setEditingId(null);
    setName("Docker Hub");
    setServerAddress("index.docker.io");
    setUsername("");
    setPassword("");
    setEnabled(true);
  }

  function startEdit(item: RegistryCredential) {
    setEditingId(item.id);
    setName(item.name);
    setServerAddress(item.serverAddress);
    setUsername(item.username);
    setPassword("");
    setEnabled(item.enabled);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return updateRegistry(editingId, {
          name: name.trim(),
          serverAddress: serverAddress.trim(),
          username: username.trim(),
          ...(password.trim().length > 0 ? { password: password.trim() } : {}),
          enabled,
        });
      }
      return createRegistry({
        name: name.trim(),
        serverAddress: serverAddress.trim(),
        username: username.trim(),
        password: password.trim(),
        enabled,
      });
    },
    onSuccess: async () => {
      toast.success(
        editingId
          ? t("settings.registries.updatedSuccess")
          : t("settings.registries.createdSuccess"),
        t("settings.tabs.registries"),
      );
      resetForm();
      await qc.invalidateQueries({ queryKey: ["settings", "registries"] });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : t("settings.registries.saveError");
      toast.error(msg, t("settings.tabs.registries"));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (item: RegistryCredential) =>
      updateRegistry(item.id, { enabled: !item.enabled }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["settings", "registries"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteRegistry(id),
    onSuccess: async () => {
      toast.success(
        t("settings.registries.deletedSuccess"),
        t("settings.tabs.registries"),
      );
      if (editingId) resetForm();
      await qc.invalidateQueries({ queryKey: ["settings", "registries"] });
    },
  });

  async function handleDelete(item: RegistryCredential) {
    const ok = await confirm.confirm({
      title: t("settings.registries.deleteConfirmTitle", { name: item.name }),
      description: t("settings.registries.deleteConfirmDescription", {
        server: item.serverAddress,
      }),
      confirmText: t("common.actions.delete"),
      cancelText: t("common.actions.cancel"),
    });
    if (!ok) return;
    deleteMutation.mutate(item.id);
  }

  const canSubmit =
    name.trim().length > 0 &&
    serverAddress.trim().length > 0 &&
    username.trim().length > 0 &&
    (editingId !== null || password.trim().length > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center gap-2 text-base font-semibold text-foreground">
            <KeyRound className="size-4 text-primary" />
            {t("settings.registries.sectionTitle")}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("settings.registries.sectionDescription")}
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("settings.registries.presetsTitle")}
            </div>
            <div className="flex flex-wrap gap-2">
              {REGISTRY_PRESETS.map((preset) => (
                <Button
                  key={preset.serverAddress}
                  type="button"
                  size="sm"
                  variant={serverAddress === preset.serverAddress ? "primary" : "outline"}
                  onClick={() => {
                    setName(preset.name);
                    setServerAddress(preset.serverAddress);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {t("settings.registries.nameLabel")}
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("settings.registries.namePlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {t("settings.registries.serverLabel")}
              </label>
              <Input
                value={serverAddress}
                onChange={(e) => setServerAddress(e.target.value)}
                placeholder={t("settings.registries.serverPlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {t("settings.registries.usernameLabel")}
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("settings.registries.usernamePlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {t("settings.registries.passwordLabel")}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={
                  editingId
                    ? t("settings.registries.passwordKeepPlaceholder")
                    : t("settings.registries.passwordPlaceholder")
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="size-4 rounded border-border"
              />
              {t("settings.registries.enabledLabel")}
            </label>

            <div className="flex items-center gap-2">
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  {t("settings.registries.cancelEdit")}
                </Button>
              ) : null}

              <Button
                type="button"
                variant="primary"
                disabled={!canSubmit || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {editingId
                  ? t("settings.registries.saveButton")
                  : t("settings.registries.addButton")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {registries.length === 0 && !registriesQuery.isLoading ? (
        <EmptyState
          title={t("settings.registries.emptyTitle")}
          description={t("settings.registries.emptyDescription")}
          icon={Server}
        />
      ) : null}

      {registries.length > 0 ? (
        <div className="grid gap-3">
          {registries.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{item.name}</span>
                    <Badge tone={item.enabled ? "green" : "gray"}>
                      {item.enabled
                        ? t("common.states.enabled")
                        : t("common.states.disabled")}
                    </Badge>
                    <Badge tone="blue" className="font-mono">
                      {item.serverAddress}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("settings.registries.usernameLabel")}:{" "}
                    <span className="font-mono text-foreground">{item.username}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => toggleMutation.mutate(item)}
                    disabled={toggleMutation.isPending}
                  >
                    {item.enabled
                      ? t("common.states.disabled")
                      : t("common.states.enabled")}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => startEdit(item)}
                  >
                    <Pencil className="size-3.5" />
                    {t("settings.registries.editAction")}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(item)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-3.5 text-red-500" />
                    {t("common.actions.delete")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
