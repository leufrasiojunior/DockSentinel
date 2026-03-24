import { useState, type ReactNode } from "react";
import {
  Boxes,
  Copy,
  HardDrive,
  Info,
  Network,
  RefreshCcw,
  Tags,
  TerminalSquare,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "../../../shared/components/ui/Card";
import { Button } from "../../../shared/components/ui/Button";
import { Input } from "../../../shared/components/ui/Input";
import { useToast } from "../../../shared/components/ui/ToastProvider";
import { type ContainerDetails } from "../types";
import { Badge } from "../../../shared/components/ui/Badge";
import { ContainerIcon } from "./ContainerIcon";
import { splitImageRef } from "../utils/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Textarea } from "../../../components/ui/textarea";

interface ContainerDetailsModalProps {
  detailsId: string | null;
  onClose: () => void;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  details?: ContainerDetails;
}

type CopyScope = "field" | "item" | "section" | "payload";

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

function isPrimitiveValue(value: unknown): value is string | number | boolean | null | undefined {
  return value == null || ["string", "number", "boolean"].includes(typeof value);
}

function formatFieldLabel(label: string) {
  const normalized = label
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return label;
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getCopyText(value: unknown) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return JSON.stringify(value, null, 2);
}

function getDisplayValue(value: unknown, emptyFallback: string) {
  if (value == null || value === "") return emptyFallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

async function copyToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard unavailable");
  }

  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "true");
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(el);

  if (!copied) {
    throw new Error("Clipboard unavailable");
  }
}

function EmptySection() {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
      {t("containers.emptySection")}
    </div>
  );
}

interface ReadonlyFieldProps {
  label: string;
  value: unknown;
  rawValue?: unknown;
  onCopy: (value: unknown, label: string, scope?: CopyScope) => void;
  multiline?: boolean;
}

function ReadonlyField({
  label,
  value,
  rawValue = value,
  onCopy,
  multiline = false,
}: ReadonlyFieldProps) {
  const { t } = useTranslation();
  const displayValue = getDisplayValue(value, t("common.states.empty"));
  const shouldUseTextarea = multiline || displayValue.includes("\n") || displayValue.length > 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </label>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="shrink-0"
          onClick={() => onCopy(rawValue, label, "field")}
          title={t("common.actions.copy")}
        >
          <Copy className="size-3.5" />
          {t("common.actions.copy")}
        </Button>
      </div>

      {shouldUseTextarea ? (
        <Textarea
          readOnly
          value={displayValue}
          className="min-h-24 resize-y font-mono text-xs leading-relaxed"
        />
      ) : (
        <Input readOnly value={displayValue} className="font-mono text-xs" />
      )}
    </div>
  );
}

interface DetailPanelProps {
  title: string;
  onCopy?: () => void;
  children: ReactNode;
}

function DetailPanel({ title, onCopy, children }: DetailPanelProps) {
  const { t } = useTranslation();

  return (
    <Card className="border-border/60 bg-muted/20 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        {onCopy ? (
          <Button type="button" variant="outline" size="xs" onClick={onCopy}>
            <Copy className="size-3.5" />
            {t("containers.copyItem")}
          </Button>
        ) : null}
      </div>
      {children}
    </Card>
  );
}

interface StructuredValueProps {
  label: string;
  value: unknown;
  onCopy: (value: unknown, label: string, scope?: CopyScope) => void;
}

function StructuredValue({ label, value, onCopy }: StructuredValueProps) {
  const { t } = useTranslation();

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <EmptySection />;
    }

    if (value.every(isPrimitiveValue)) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {value.map((item, index) => (
            <ReadonlyField
              key={`${label}_${index}`}
              label={t("containers.itemLabel", { index: index + 1 })}
              value={item}
              rawValue={item}
              onCopy={onCopy}
              multiline={typeof item === "string" && item.length > 120}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {value.map((item, index) => (
          <DetailPanel
            key={`${label}_${index}`}
            title={t("containers.itemLabel", { index: index + 1 })}
            onCopy={() => onCopy(item, t("containers.itemLabel", { index: index + 1 }), "item")}
          >
            <StructuredValue
              label={t("containers.itemLabel", { index: index + 1 })}
              value={item}
              onCopy={onCopy}
            />
          </DetailPanel>
        ))}
      </div>
    );
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <EmptySection />;
    }

    const primitiveEntries = entries.filter(([, entryValue]) => isPrimitiveValue(entryValue));
    const nestedEntries = entries.filter(([, entryValue]) => !isPrimitiveValue(entryValue));

    return (
      <div className="space-y-4">
        {primitiveEntries.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {primitiveEntries.map(([key, entryValue]) => (
              <ReadonlyField
                key={key}
                label={formatFieldLabel(key)}
                value={entryValue}
                rawValue={entryValue}
                onCopy={onCopy}
              />
            ))}
          </div>
        ) : null}

        {nestedEntries.map(([key, entryValue]) => (
          <DetailPanel
            key={key}
            title={formatFieldLabel(key)}
            onCopy={() => onCopy(entryValue, formatFieldLabel(key), "item")}
          >
            <StructuredValue label={formatFieldLabel(key)} value={entryValue} onCopy={onCopy} />
          </DetailPanel>
        ))}
      </div>
    );
  }

  return <ReadonlyField label={label} value={value} rawValue={value} onCopy={onCopy} />;
}

function EnvFields({
  lines,
  onCopy,
}: {
  lines: string[];
  onCopy: (value: unknown, label: string, scope?: CopyScope) => void;
}) {
  const { t } = useTranslation();

  if (lines.length === 0) {
    return <EmptySection />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {lines.map((line, index) => {
        const separatorIndex = line.indexOf("=");
        const label =
          separatorIndex > 0 ? line.slice(0, separatorIndex) : t("containers.itemLabel", { index: index + 1 });
        const value = separatorIndex >= 0 ? line.slice(separatorIndex + 1) : line;

        return (
          <ReadonlyField
            key={`${label}_${index}`}
            label={label}
            value={value}
            rawValue={line}
            onCopy={onCopy}
            multiline={value.includes("\n") || value.length > 120}
          />
        );
      })}
    </div>
  );
}

function TabSectionHeader({
  icon: Icon,
  title,
  onCopy,
}: {
  icon: LucideIcon;
  title: string;
  onCopy: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <div className="rounded-xl border border-border/60 bg-muted/35 p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <span>{title}</span>
      </div>

      <Button type="button" variant="outline" size="xs" onClick={onCopy}>
        <Copy className="size-3.5" />
        {t("containers.copySection")}
      </Button>
    </div>
  );
}

export function ContainerDetailsModal({
  detailsId,
  onClose,
  isLoading,
  isError,
  error,
  details,
}: ContainerDetailsModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [activeTabState, setActiveTabState] = useState<{
    detailsId: string | null;
    value: string | null;
  }>({ detailsId: null, value: null });

  const extras = details
    ? Object.fromEntries(
        Object.entries(details).filter(
          ([key]) =>
            ![
              "id",
              "name",
              "image",
              "state",
              "status",
              "env",
              "labels",
              "restartPolicy",
              "ports",
              "mounts",
              "networks",
            ].includes(key),
        ),
      )
    : null;

  async function handleCopy(value: unknown, label: string, scope: CopyScope = "field") {
    try {
      await copyToClipboard(getCopyText(value));

      if (scope === "payload") {
        toast.success(t("containers.copyPayloadSuccess"), t("common.actions.copy"));
        return;
      }

      toast.success(
        t("containers.copySuccess", { label }),
        t("common.actions.copy"),
      );
    } catch {
      toast.error(
        t("containers.copyFailed", { label }),
        t("common.actions.copy"),
      );
    }
  }

  const detailTabs = details
    ? [
        {
          value: "container-details",
          label: t("containers.sections.containerDetails"),
          icon: Info,
          rawValue: {
            id: details.id,
            name: details.name,
            image: details.image,
            state: details.state,
            status: details.status,
          },
          content: (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ReadonlyField label="ID" value={details.id} onCopy={handleCopy} />
              <ReadonlyField
                label={t("common.labels.container")}
                value={details.name}
                onCopy={handleCopy}
              />
              <ReadonlyField
                label={t("common.labels.image")}
                value={details.image}
                onCopy={handleCopy}
                multiline
              />
              <ReadonlyField
                label={t("containers.columns.state")}
                value={details.state}
                onCopy={handleCopy}
              />
              <ReadonlyField
                label={t("common.labels.status")}
                value={details.status}
                onCopy={handleCopy}
              />
            </div>
          ),
        },
        Array.isArray(details.env)
          ? {
              value: "env",
              label: t("containers.sections.env"),
              icon: TerminalSquare,
              rawValue: details.env,
              content: <EnvFields lines={details.env} onCopy={handleCopy} />,
            }
          : null,
        details.labels && typeof details.labels === "object"
          ? {
              value: "labels",
              label: t("containers.sections.labels"),
              icon: Tags,
              rawValue: details.labels,
              content: (
                <StructuredValue
                  label={t("containers.sections.labels")}
                  value={details.labels}
                  onCopy={handleCopy}
                />
              ),
            }
          : null,
        details.restartPolicy && typeof details.restartPolicy === "object"
          ? {
              value: "restart-policy",
              label: t("containers.sections.restartPolicy"),
              icon: RefreshCcw,
              rawValue: details.restartPolicy,
              content: (
                <StructuredValue
                  label={t("containers.sections.restartPolicy")}
                  value={details.restartPolicy}
                  onCopy={handleCopy}
                />
              ),
            }
          : null,
        Array.isArray(details.ports)
          ? {
              value: "ports",
              label: t("containers.sections.ports"),
              icon: Waypoints,
              rawValue: details.ports,
              content: (
                <StructuredValue
                  label={t("containers.sections.ports")}
                  value={details.ports}
                  onCopy={handleCopy}
                />
              ),
            }
          : null,
        Array.isArray(details.mounts)
          ? {
              value: "mounts",
              label: t("containers.sections.mounts"),
              icon: HardDrive,
              rawValue: details.mounts,
              content: (
                <StructuredValue
                  label={t("containers.sections.mounts")}
                  value={details.mounts}
                  onCopy={handleCopy}
                />
              ),
            }
          : null,
        Array.isArray(details.networks)
          ? {
              value: "networks",
              label: t("containers.sections.networks"),
              icon: Network,
              rawValue: details.networks,
              content: (
                <StructuredValue
                  label={t("containers.sections.networks")}
                  value={details.networks}
                  onCopy={handleCopy}
                />
              ),
            }
          : null,
        extras && Object.keys(extras).length > 0
          ? {
              value: "other",
              label: t("containers.sections.other"),
              icon: Boxes,
              rawValue: extras,
              content: (
                <StructuredValue
                  label={t("containers.sections.other")}
                  value={extras}
                  onCopy={handleCopy}
                />
              ),
            }
          : null,
      ].filter(Boolean) as Array<{
        value: string;
        label: string;
        icon: LucideIcon;
        rawValue: unknown;
        content: ReactNode;
      }>
    : [];

  const currentTab =
    activeTabState.detailsId === detailsId &&
    activeTabState.value &&
    detailTabs.some((tab) => tab.value === activeTabState.value)
      ? activeTabState.value
      : (detailTabs[0]?.value ?? "");

  const imageRef = details ? splitImageRef(details.image) : null;

  return (
    <Dialog open={!!detailsId} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="flex h-[88vh] max-h-[88vh] max-w-6xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-6 pr-20 text-left sm:pr-24">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {details && imageRef ? (
                <Card className="mx-auto flex  max-w-180px items-center justify-center border-border/60 bg-muted/20 p-4 sm:mx-0 sm:w-180px">
                  <div className="flex w-full justify-center">
                    <div className="rounded-[1.75rem] border border-border/60 bg-background/80 p-3 shadow-sm">
                      <ContainerIcon
                        imageRepo={imageRef.repo}
                        containerName={details.name}
                        size="lg"
                      />
                    </div>
                  </div>
                </Card>
              ) : null}

              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="blue">{t("containers.detailsBadge")}</Badge>
                  {details?.state ? <Badge tone="gray">{details.state}</Badge> : null}
                </div>
                <div>
                  <DialogTitle>{t("containers.detailsTitle")}</DialogTitle>
                  <DialogDescription>
                    {detailsId ? (
                      t("containers.detailsDescription.withId", { id: detailsId })
                    ) : (
                      t("containers.detailsDescription.fallback")
                    )}
                  </DialogDescription>
                </div>

                {details ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-fit"
                    onClick={() => handleCopy(details, t("containers.detailsTitle"), "payload")}
                  >
                    <Copy className="size-4" />
                    {t("containers.copyBackendPayload")}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6">
          {isLoading && (
            <div className="mt-6 text-sm text-muted-foreground">{t("containers.loadingDetails")}</div>
          )}

          {isError && (
            <Card className="mt-6 border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {t("containers.loadDetailsError", {
                message: errorMessage(error, t("common.states.unknown")),
              })}
            </Card>
          )}

          {details && (
            <div className="mt-6 flex min-h-0 flex-1 flex-col">
              {detailTabs.length > 0 ? (
                <Tabs
                  className="flex min-h-0 flex-1 flex-col"
                  value={currentTab}
                  onValueChange={(value) => setActiveTabState({ detailsId, value })}
                >
                  <TabsList className="w-full shrink-0 justify-start overflow-x-auto">
                    {detailTabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger key={tab.value} value={tab.value}>
                          <Icon className="size-4" />
                          {tab.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {detailTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsContent key={tab.value} value={tab.value} className="min-h-0 flex-1 overflow-hidden">
                        <Card className="flex h-full min-h-0 flex-col border-border/60 bg-background/65 p-4">
                          <TabSectionHeader
                            icon={Icon}
                            title={tab.label}
                            onCopy={() => handleCopy(tab.rawValue, tab.label, "section")}
                          />
                          <div className="min-h-0 flex-1 overflow-auto pr-1">
                            {tab.content}
                          </div>
                        </Card>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
