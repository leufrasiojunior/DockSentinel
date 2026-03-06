import { Card } from "../../../shared/components/ui/Card";
import { Button } from "../../../shared/components/ui/Button";
import { type ContainerDetails } from "../types";

interface ContainerDetailsModalProps {
  detailsId: string | null;
  onClose: () => void;
  isLoading: boolean;
  isError: boolean;
  error: any;
  details?: ContainerDetails;
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="whitespace-pre-wrap wrap-break-word rounded-md bg-slate-50 p-3 text-xs text-slate-800 border">
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
  if (!detailsId) return null;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <button
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Fechar"
        type="button"
      />

      <div className="relative w-full max-w-3xl">
        <Card className="p-4 max-h-[85vh] overflow-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">Detalhes do container</div>
              <div className="mt-1 text-xs text-gray-600">
                ID: <span className="font-mono">{detailsId}</span>
              </div>
            </div>

            <Button type="button" onClick={onClose}>
              Fechar
            </Button>
          </div>

          {isLoading && (
            <div className="mt-4 text-sm text-gray-600">Carregando detalhes dos containers...</div>
          )}

          {isError && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Erro ao carregar detalhes: {error?.message ?? "desconhecido"}
            </div>
          )}

          {details && (
            <div className="mt-4 space-y-4">
              {/* principais */}
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-gray-600">Name</div>
                  <div className="font-medium">{details.name}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-gray-600">Image</div>
                  <div className="font-mono text-xs wrap-break-word">{details.image}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-gray-600">State</div>
                  <div className="font-medium">{details.state}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-gray-600">Status</div>
                  <div className="font-medium">{details.status}</div>
                </div>
              </div>

              {/* ENV */}
              {Array.isArray(details.env) && (
                <div>
                  <div className="text-sm font-semibold mb-2">Env</div>
                  <div className="rounded-md border bg-white">
                    <div className="max-h-48 overflow-auto p-3 text-xs font-mono">
                      {details.env.length === 0 ? (
                        <div className="text-gray-500">Sem env.</div>
                      ) : (
                        <ul className="space-y-1">
                          {details.env.map((line, idx) => (
                            <li key={idx} className="wrap-break-word">
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Labels */}
              {details.labels && typeof details.labels === "object" && (
                <div>
                  <div className="text-sm font-semibold mb-2">Labels</div>
                  <JsonBlock value={details.labels} />
                </div>
              )}

              {/* Restart Policy */}
              {details.restartPolicy && typeof details.restartPolicy === "object" && (
                <div>
                  <div className="text-sm font-semibold mb-2">Restart policy</div>
                  <JsonBlock value={details.restartPolicy} />
                </div>
              )}

              {/* Ports */}
              {Array.isArray(details.ports) && (
                <div>
                  <div className="text-sm font-semibold mb-2">Ports</div>
                  <JsonBlock value={details.ports} />
                </div>
              )}

              {/* Mounts */}
              {Array.isArray(details.mounts) && (
                <div>
                  <div className="text-sm font-semibold mb-2">Mounts</div>
                  <JsonBlock value={details.mounts} />
                </div>
              )}

              {/* Networks */}
              {Array.isArray(details.networks) && (
                <div>
                  <div className="text-sm font-semibold mb-2">Networks</div>
                  <JsonBlock value={details.networks} />
                </div>
              )}

              {/* Extras */}
              {extras && Object.keys(extras).length > 0 && (
                <div>
                  <div className="text-sm font-semibold mb-2">Outros detalhes</div>
                  <JsonBlock value={extras} />
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
