import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";
import { Card, CardHeader } from "../../../shared/components/ui/Card";
import { ContainerIcon } from "./ContainerIcon";
import { splitImageRef } from "../utils/image";
import { getAllowAutoUpdateFromLabels, type DockerContainer } from "../api/docker";
import { type CheckState } from "../types";

interface ContainerTableProps {
  containers: DockerContainer[];
  loading: boolean;
  selected: Record<string, boolean>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (name: string) => void;
  onDetails: (id: string) => void;
  onCheck: (name: string) => void;
  onUpdate: (name: string) => void;
  checks: Record<string, CheckState>;
  busy: boolean;
}

export function ContainerTable({
  containers,
  loading,
  selected,
  allSelected,
  onToggleAll,
  onToggleOne,
  onDetails,
  onCheck,
  onUpdate,
  checks,
  busy,
}: ContainerTableProps) {
  function renderUpdateBadge(name: string, labels: Record<string, string>) {
    const allow = getAllowAutoUpdateFromLabels(labels);
    const st = checks[name];

    if (!allow) return <Badge tone="gray">Auto update OFF</Badge>;
    if (!st || st.status === "idle")
      return <Badge tone="gray">Não checado</Badge>;
    if (st.status === "checking") return <Badge tone="blue">Checando...</Badge>;
    if (st.status === "error") return <Badge tone="red">Erro</Badge>;

    if (st.result.hasUpdate === true)
      return <Badge tone="yellow">Update disponível</Badge>;
    if (st.result.hasUpdate === false)
      return <Badge tone="green">Atualizado</Badge>;
    return <Badge tone="gray">Checado</Badge>;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={`Containers (${containers.length})`}
        subtitle={
          <>
            Auto-update bloqueado quando label{" "}
            <span className="font-mono">docksentinel.update=false</span>.
          </>
        }
      />

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  disabled={containers.length === 0}
                />
              </th>
              <th className="px-4 py-3">Container</th>
              <th className="px-4 py-3">Imagem</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Update</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {loading && (
              <tr>
                <td className="px-4 py-4 text-gray-600" colSpan={6}>
                  Carregando...
                </td>
              </tr>
            )}

            {!loading && containers.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-gray-600" colSpan={6}>
                  Nenhum container encontrado.
                </td>
              </tr>
            )}

            {containers.map((c) => {
              const allowAutoUpdate = getAllowAutoUpdateFromLabels(c.labels);
              const img = splitImageRef(c.image);

              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={!!selected[c.name]}
                      onChange={() => onToggleOne(c.name)}
                    />
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <ContainerIcon imageRepo={img.repo} containerName={c.name} />

                      <div>
                        <div className="font-medium text-gray-900">
                          {c.name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono truncate max-w-55">
                          {c.id.slice(0, 12)}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-mono text-xs text-gray-900 truncate max-w-130">
                      {img.repo}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone="gray">{img.tag || "no-tag"}</Badge>
                      {!allowAutoUpdate && <Badge tone="gray">blocked</Badge>}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{c.state}</div>
                    <div className="text-xs text-gray-500">{c.status}</div>
                  </td>

                  <td className="px-4 py-4">
                    {renderUpdateBadge(c.name, c.labels)}
                    {checks[c.name]?.status === "error" && (
                      <div className="mt-1 text-[11px] text-red-600">
                        {(checks[c.name] as any).error}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => onDetails(c.id)}
                        disabled={busy}
                        type="button"
                      >
                        Detalhes
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => onCheck(c.name)}
                        disabled={busy}
                        type="button"
                      >
                        Checar
                      </Button>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onUpdate(c.name)}
                        disabled={busy || !allowAutoUpdate}
                        type="button"
                      >
                        Atualizar
                      </Button>
                    </div>

                    {!allowAutoUpdate && (
                      <div className="mt-1 text-[11px] text-gray-500">
                        bloqueado por label
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
