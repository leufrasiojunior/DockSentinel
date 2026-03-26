import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Boxes,
  Globe,
  HeartPulse,
  HousePlug,
  Power,
  PowerOff,
  RefreshCcw,
  ShieldAlert,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "../../components/product/empty-state";
import { PageHeader } from "../../components/product/page-header";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  buildEnvironmentPath,
  listEnvironmentOverview,
  type EnvironmentOverview,
} from "../../features/environments/api/environments";
import { writeStoredEnvironmentId } from "../../features/environments/hooks/useEnvironmentRoute";

function errorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | null;
  icon: typeof Boxes;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/25 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value == null ? "—" : value}
      </div>
    </div>
  );
}

function EnvironmentCard({ item }: { item: EnvironmentOverview }) {
  const { environment, connection, containers } = item;
  const isLocal = connection.mode === "local";
  const isUp = environment.status === "online";
  const destination = buildEnvironmentPath(environment.id, "dashboard");
  const EnvironmentIcon = isLocal ? HousePlug : Globe;
  const StatusIcon = isUp ? Wifi : WifiOff;

  return (
    <Link
      to={destination}
      onClick={() => writeStoredEnvironmentId(environment.id)}
      className="block group"
    >
      <Card className="h-full overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/35 group-hover:shadow-[0_24px_80px_-44px_rgba(16,24,40,0.55)]">
        <div className="border-b border-border/60 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/35 text-foreground">
                <EnvironmentIcon className="size-5" />
              </div>
              <div className="min-w-0 space-y-2">
                <div className="truncate text-xl font-semibold tracking-tight text-foreground">
                  {environment.name}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={isUp ? "success" : "destructive"} className="gap-1.5">
                    <StatusIcon className="size-3.5" />
                    {isUp ? "UP" : "DOWN"}
                  </Badge>
                  <Badge variant="outline">{isLocal ? "Local" : "Remote"}</Badge>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 px-3 py-2 text-right">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Agent
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">
                {environment.agentVersion ?? "—"}
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            {isLocal ? connection.label : `Remote - ${connection.label}`}
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Containers" value={containers.total} icon={Boxes} />
            <Metric label="On" value={containers.running} icon={Power} />
            <Metric label="Off" value={containers.stopped} icon={PowerOff} />
            <Metric label="Health" value={containers.healthy} icon={HeartPulse} />
          </div>

          {!containers.available ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Data unavailable
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 px-6 py-4 text-sm font-medium text-foreground">
          <span>Open dashboard</span>
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  );
}

export function HomePage() {
  const overviewQuery = useQuery({
    queryKey: ["environments", "overview"],
    queryFn: listEnvironmentOverview,
    retry: false,
  });

  const items = overviewQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Home"
        title="Home"
        description="Select an environment to connect and continue to its dashboard."
        actions={(
          <Button
            type="button"
            variant="outline"
            onClick={() => overviewQuery.refetch()}
            disabled={overviewQuery.isFetching}
          >
            <RefreshCcw className="size-4" />
            Reload
          </Button>
        )}
      />

      {overviewQuery.isError ? (
        <EmptyState
          title="Could not load environments"
          description={errorMessage(
            overviewQuery.error,
            "The environments overview is unavailable right now.",
          )}
          icon={ShieldAlert}
          actions={(
            <Button type="button" variant="primary" onClick={() => overviewQuery.refetch()}>
              Retry
            </Button>
          )}
        />
      ) : null}

      {!overviewQuery.isError && items.length === 0 ? (
        <EmptyState
          title="No environments found"
          description="Create or restore an environment to start using DockSentinel."
          icon={HousePlug}
        />
      ) : null}

      {!overviewQuery.isError && items.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <EnvironmentCard key={item.environment.id} item={item} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
