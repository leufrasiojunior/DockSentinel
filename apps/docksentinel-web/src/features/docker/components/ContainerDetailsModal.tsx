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

export function ContainerDetailsModal({
  detailsId,
  onClose,
  isLoading,
  isError,
  error,
  details,
}: ContainerDetailsModalProps) {
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

  return (
    <Dialog open={!!detailsId} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border/60 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="blue">Container details</Badge>
            {details?.state ? <Badge tone="gray">{details.state}</Badge> : null}
          </div>
          <DialogTitle>Detalhes do container</DialogTitle>
          <DialogDescription>
            {detailsId ? (
              <>
                ID: <span className="font-mono text-foreground">{detailsId}</span>
              </>
            ) : (
              "Inspeção detalhada do container selecionado."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[78vh] overflow-auto px-6 pb-6">
          {isLoading && (
            <div className="mt-6 text-sm text-muted-foreground">Carregando detalhes do container...</div>
          )}

          {isError && (
            <Card className="mt-6 border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              Erro ao carregar detalhes: {errorMessage(error, "desconhecido")}
            </Card>
          )}

          {details && (
            <div className="mt-6 space-y-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/60 bg-muted/25 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Name</div>
                  <div className="mt-2 font-medium text-foreground">{details.name}</div>
                </Card>
                <Card className="border-border/60 bg-muted/25 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Image</div>
                  <div className="mt-2 font-mono text-xs text-foreground break-all">{details.image}</div>
                </Card>
                <Card className="border-border/60 bg-muted/25 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">State</div>
                  <div className="mt-2 font-medium text-foreground">{details.state}</div>
                </Card>
                <Card className="border-border/60 bg-muted/25 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Status</div>
                  <div className="mt-2 font-medium text-foreground">{details.status}</div>
                </Card>
              </div>

              {Array.isArray(details.env) && (
                <div>
                  <div className="mb-2 text-sm font-semibold text-foreground">Env</div>
                  <div className="rounded-3xl border border-border/60 bg-muted/25">
                    <div className="max-h-48 overflow-auto p-4 text-xs font-mono text-foreground">
                      {details.env.length === 0 ? (
                        <div className="italic text-muted-foreground">Sem env.</div>
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
                </div>
              )}

              {details.labels && typeof details.labels === "object" && (
                <div>
                  <div className="mb-2 text-sm font-semibold text-foreground">Labels</div>
                  <JsonBlock value={details.labels} />
                </div>
              )}

              {details.restartPolicy && typeof details.restartPolicy === "object" && (
                <div>
                  <div className="mb-2 text-sm font-semibold text-foreground">Restart policy</div>
                  <JsonBlock value={details.restartPolicy} />
                </div>
              )}

              {Array.isArray(details.ports) && (
                <div>
                  <div className="mb-2 text-sm font-semibold text-foreground">Ports</div>
                  <JsonBlock value={details.ports} />
                </div>
              )}

              {Array.isArray(details.mounts) && (
                <div>
                  <div className="mb-2 text-sm font-semibold text-foreground">Mounts</div>
                  <JsonBlock value={details.mounts} />
                </div>
              )}

              {Array.isArray(details.networks) && (
                <div>
                  <div className="mb-2 text-sm font-semibold text-foreground">Networks</div>
                  <JsonBlock value={details.networks} />
                </div>
              )}

              {extras && Object.keys(extras).length > 0 && (
                <div>
                  <div className="mb-2 text-sm font-semibold text-foreground">Outros detalhes</div>
                  <JsonBlock value={extras} />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
