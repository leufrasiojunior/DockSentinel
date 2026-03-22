import { useEffect, useState, type ReactNode } from "react";
import {
  Boxes,
  HardDrive,
  Network,
  RefreshCcw,
  Tags,
  TerminalSquare,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "../../../shared/components/ui/Card";
import { type ContainerDetails } from "../types";
import { Badge } from "../../../shared/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";

interface ContainerDetailsModalProps {
  detailsId: string | null;
  onClose: () => void;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  details?: ContainerDetails;
}

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="whitespace-pre-wrap wrap-break-word rounded-md bg-muted/50 p-3 text-xs text-foreground border border-border font-mono">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

function TabSectionHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
      <div className="rounded-xl border border-border/60 bg-muted/35 p-2 text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <span>{title}</span>
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
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const extras = details
    ? Object.fromEntries(
        Object.entries(details).filter(
          ([k]) =>
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
            ].includes(k),
        ),
      )
    : null;
  const detailTabs = details
    ? [
        Array.isArray(details.env)
          ? {
              value: "env",
              label: t("containers.sections.env"),
              icon: TerminalSquare,
              content: (
                <div className="rounded-3xl border border-border/60 bg-muted/25">
                  <div className="max-h-72 overflow-auto p-4 text-xs font-mono text-foreground">
                    {details.env.length === 0 ? (
                      <div className="italic text-muted-foreground">{t("containers.noEnv")}</div>
                    ) : (
                      <ul className="space-y-1">
                        {details.env.map((line, idx) => (
                          <li key={idx} className="break-all">
                            {line}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ),
            }
          : null,
        details.labels && typeof details.labels === "object"
          ? {
              value: "labels",
              label: t("containers.sections.labels"),
              icon: Tags,
              content: <JsonBlock value={details.labels} />,
            }
          : null,
        details.restartPolicy && typeof details.restartPolicy === "object"
          ? {
              value: "restart-policy",
              label: t("containers.sections.restartPolicy"),
              icon: RefreshCcw,
              content: <JsonBlock value={details.restartPolicy} />,
            }
          : null,
        Array.isArray(details.ports)
          ? {
              value: "ports",
              label: t("containers.sections.ports"),
              icon: Waypoints,
              content: <JsonBlock value={details.ports} />,
            }
          : null,
        Array.isArray(details.mounts)
          ? {
              value: "mounts",
              label: t("containers.sections.mounts"),
              icon: HardDrive,
              content: <JsonBlock value={details.mounts} />,
            }
          : null,
        Array.isArray(details.networks)
          ? {
              value: "networks",
              label: t("containers.sections.networks"),
              icon: Network,
              content: <JsonBlock value={details.networks} />,
            }
          : null,
        extras && Object.keys(extras).length > 0
          ? {
              value: "other",
              label: t("containers.sections.other"),
              icon: Boxes,
              content: <JsonBlock value={extras} />,
            }
          : null,
      ].filter(Boolean) as Array<{
        value: string;
        label: string;
        icon: LucideIcon;
        content: ReactNode;
      }>
    : [];
  const currentTab =
    activeTab && detailTabs.some((tab) => tab.value === activeTab)
      ? activeTab
      : (detailTabs[0]?.value ?? "");

  useEffect(() => {
    setActiveTab(null);
  }, [detailsId]);

  return (
    <Dialog open={!!detailsId} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="blue">{t("containers.detailsBadge")}</Badge>
            {details?.state ? <Badge tone="gray">{details.state}</Badge> : null}
          </div>
          <DialogTitle>{t("containers.detailsTitle")}</DialogTitle>
          <DialogDescription>
            {detailsId ? (
              t("containers.detailsDescription.withId", { id: detailsId })
            ) : (
              t("containers.detailsDescription.fallback")
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[78vh] overflow-auto px-6 pb-6">
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
            <div className="mt-6 space-y-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/60 bg-muted/25 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <Boxes className="size-3.5" />
                    {t("common.labels.container")}
                  </div>
                  <div className="mt-2 font-medium text-foreground">{details.name}</div>
                </Card>
                <Card className="border-border/60 bg-muted/25 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <Waypoints className="size-3.5" />
                    {t("common.labels.image")}
                  </div>
                  <div className="mt-2 font-mono text-xs text-foreground break-all">{details.image}</div>
                </Card>
                <Card className="border-border/60 bg-muted/25 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <RefreshCcw className="size-3.5" />
                    {t("containers.columns.state")}
                  </div>
                  <div className="mt-2 font-medium text-foreground">{details.state}</div>
                </Card>
                <Card className="border-border/60 bg-muted/25 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <TerminalSquare className="size-3.5" />
                    {t("common.labels.status")}
                  </div>
                  <div className="mt-2 font-medium text-foreground">{details.status}</div>
                </Card>
              </div>

              {detailTabs.length > 0 ? (
                <Tabs value={currentTab} onValueChange={setActiveTab}>
                  <TabsList className="w-full justify-start">
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
                      <TabsContent key={tab.value} value={tab.value}>
                        <Card className="border-border/60 bg-background/65 p-4">
                          <TabSectionHeader icon={Icon} title={tab.label} />
                          {tab.content}
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
