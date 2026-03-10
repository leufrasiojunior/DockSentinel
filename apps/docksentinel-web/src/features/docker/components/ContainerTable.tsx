import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";
import { Card, CardHeader } from "../../../shared/components/ui/Card";
import { ContainerIcon } from "./ContainerIcon";
import { splitImageRef } from "../utils/image";
import { getAllowAutoUpdateFromLabels, type DockerContainer } from "../api/docker";
import { type CheckState } from "../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { cn } from "../../../shared/lib/utils/cn";

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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                className="cursor-pointer"
                checked={allSelected}
                onChange={onToggleAll}
                disabled={containers.length === 0}
              />
            </TableHead>
            <TableHead className="text-left">Container</TableHead>
            <TableHead className="text-left">Imagem</TableHead>
            <TableHead className="text-left">Estado</TableHead>
            <TableHead className="text-left">Update</TableHead>
            <TableHead className="text-left">Ações</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                Carregando...
              </TableCell>
            </TableRow>
          )}

          {!loading && containers.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                Nenhum container encontrado.
              </TableCell>
            </TableRow>
          )}

          {containers.map((c) => {
            const allowAutoUpdate = getAllowAutoUpdateFromLabels(c.labels);
            const img = splitImageRef(c.image);

            return (
              <TableRow key={c.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    className="cursor-pointer"
                    checked={!!selected[c.name]}
                    onChange={() => onToggleOne(c.name)}
                  />
                </TableCell>

                <TableCell className="text-left">
                  <div className="flex items-center gap-3">
                    <ContainerIcon imageRepo={img.repo} containerName={c.name} />

                    <div>
                      <div className="font-medium text-foreground">
                        {c.name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                        {c.id.slice(0, 12)}
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-left">
                  <div className="font-mono text-xs text-foreground truncate max-w-[400px]">
                    {img.repo}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge tone="gray">{img.tag || "no-tag"}</Badge>
                    {!allowAutoUpdate && <Badge tone="gray">blocked</Badge>}
                  </div>
                </TableCell>

                <TableCell className="text-left">
                  <div className="font-medium text-foreground">{c.state}</div>
                  <div className="text-xs text-muted-foreground">{c.status}</div>
                </TableCell>

                <TableCell className="text-left">
                  {renderUpdateBadge(c.name, c.labels)}
                  {checks[c.name]?.status === "error" && (
                    <div className="mt-1 text-[11px] text-red-500">
                      {(checks[c.name] as any).error}
                    </div>
                  )}
                </TableCell>

                <TableCell className="text-left">
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
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      bloqueado por label
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
