import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { updatesApi } from "../api/updates";
import type { SchedulerConfig } from "../api/types";

export function SchedulerPage() {
  const configQ = useQuery({ queryKey: ["scheduler-config"], queryFn: updatesApi.schedulerConfig });
  const [draft, setDraft] = useState<SchedulerConfig | null>(null);

  const save = useMutation({
    mutationFn: (body: Partial<SchedulerConfig>) => updatesApi.schedulerConfigPatch(body),
    onSuccess: (data) => setDraft(data),
  });

  if (configQ.isLoading) return <div>Carregando...</div>;
  if (configQ.isError) return <div>Erro ao carregar scheduler</div>;

  const cfg = draft ?? configQ.data;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Scheduler</h1>

      <div className="rounded-xl bg-white p-6 shadow space-y-4">
        <Row label="Enabled">
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={(e) => setDraft({ ...cfg, enabled: e.target.checked })}
          />
        </Row>

        <Row label="cronExpr">
          <input
            className="w-full rounded-md border px-3 py-2"
            value={cfg.cronExpr}
            onChange={(e) => setDraft({ ...cfg, cronExpr: e.target.value })}
          />
        </Row>

        <Row label="mode">
          <select
            className="rounded-md border px-3 py-2"
            value={cfg.mode}
            onChange={(e) => setDraft({ ...cfg, mode: e.target.value as any })}
          >
            <option value="scan_only">scan_only</option>
            <option value="scan_and_update">scan_and_update</option>
          </select>
        </Row>

        <div className="pt-2">
          <button
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            onClick={() => save.mutate({ enabled: cfg.enabled, cronExpr: cfg.cronExpr, mode: cfg.mode, scope: cfg.scope })}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-4 md:items-center">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="md:col-span-3">{children}</div>
    </div>
  );
}
