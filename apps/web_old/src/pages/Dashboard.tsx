import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dockerApi } from "../api/docker";
import { updatesApi } from "../api/updates";
import type { UpdateCheckResult } from "../api/types";

type RowActionsProps = {
  name: string;
  onChecked?: () => void | Promise<any>;
};

function UpdateBadge({ check }: { check?: UpdateCheckResult }) {
  if (!check) {
    return <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">—</span>;
  }

  if (!check.canCheckLocal || !check.canCheckRemote) {
    return (
      <span className="rounded-md bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
        INDETERMINADO
      </span>
    );
  }

  if (check.hasUpdate) {
    return (
      <span className="rounded-md bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
        DISPONÍVEL
      </span>
    );
  }

  return <span className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-800">OK</span>;
}


export function DashboardPage() {
  const qc = useQueryClient();
  const containersQ = useQuery({ queryKey: ["containers"], queryFn: dockerApi.listContainers });

  const scanMutation = useMutation({
    mutationFn: (mode: "scan_only" | "scan_and_update") => updatesApi.scanAndEnqueue({ mode }),
  });

  if (containersQ.isLoading) return <div>Carregando...</div>;
  if (containersQ.isError) return <div>Erro ao carregar containers</div>;

  const containers = containersQ.data ?? [];
  const running = containers.filter((c) => c.state === "running").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Containers do host Docker e status de update por digest.</p>
        </div>

        <div className="flex gap-3">
          <button
            className="rounded-md border bg-white px-4 py-2 text-sm hover:bg-slate-50"
            onClick={() => scanMutation.mutate("scan_only")}
          >
            Checar todos agora
          </button>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
            Atualizar selecionados
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Containers Ativos" value={String(running)} sub="Running" />
        <Card title="Updates Disponíveis" value="—" sub="Pendentes" />
        <Card title="Falhas Recentes" value="—" sub="Erro" />
      </div>

      <div className="rounded-xl bg-white shadow">
        <div className="border-b px-6 py-4 text-lg font-semibold">Containers</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
<thead className="text-slate-500">
  <tr className="border-b">
    <th className="px-6 py-3 text-left">Nome</th>
    <th className="px-6 py-3 text-left">Image</th>
    <th className="px-6 py-3 text-left">Status</th>
    <th className="px-6 py-3 text-left">Update</th>
    <th className="px-6 py-3 text-left">Ações</th>
  </tr>
</thead>

            <tbody>
{containers.map((c) => {
  const check = qc.getQueryData<UpdateCheckResult>(["update-check", c.name]);

  return (
    <tr key={c.id} className="border-b last:border-b-0">
      <td className="px-6 py-3 font-medium">{c.name}</td>
      <td className="px-6 py-3">{c.image}</td>
      <td className="px-6 py-3">{c.status}</td>

      {/* NOVA COLUNA */}
      <td className="px-6 py-3">
        <UpdateBadge check={check} />
      </td>

      <td className="px-6 py-3">
        <RowActions name={c.name} />
      </td>
    </tr>
  );
})}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function RowActions({ name, onChecked }: RowActionsProps) {
  const qc = useQueryClient();

const checkMutation = useMutation({
  mutationFn: async () => {
    await onChecked?.(); // isso chama checkQ.refetch()
  },
});



  const cachedCheck = qc.getQueryData<UpdateCheckResult>(["update-check", name]);

  // Só habilita "Atualizar" quando tem hasUpdate true
  // (ou você pode oferecer um botão "Force" separado)
  const canUpdate = Boolean(cachedCheck?.hasUpdate);

  const updateMutation = useMutation({
    mutationFn: () => dockerApi.update(name, { pull: true, force: false }),
    onSuccess: () => {
      // depois de atualizar, ideal é re-checar (ou invalidar)
      qc.invalidateQueries({ queryKey: ["containers"] });
      qc.invalidateQueries({ queryKey: ["update-check", name] });
    },
  });

  const forceMutation = useMutation({
    mutationFn: () => dockerApi.update(name, { pull: true, force: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["containers"] });
      qc.invalidateQueries({ querysKey: ["update-check", name] });
    },
  });

  return (
    <div className="flex gap-2">
      <button
        className="rounded-md border px-3 py-1.5 hover:bg-slate-50"
        onClick={() => checkMutation.mutate()}
        disabled={checkMutation.isPending}
      >
        Checar
      </button>

      <button
        className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50"
        onClick={() => updateMutation.mutate()}
        disabled={!canUpdate || updateMutation.isPending}
        title={!canUpdate ? "Sem update disponível (faça Checar ou use Force)" : undefined}
      >
        Atualizar
      </button>

      <button
        className="rounded-md border px-3 py-1.5 hover:bg-slate-50"
        onClick={() => forceMutation.mutate()}
        disabled={forceMutation.isPending}
        title="Força update mesmo sem hasUpdate"
      >
        Force
      </button>
    </div>
  );
}

function Card({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-semibold">{value}</div>
        <div className="text-slate-500">{sub}</div>
      </div>
    </div>
  );
}


