import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../layouts/ui/Button";
import { Badge } from "../../layouts/ui/Badge";
import { Card, CardHeader } from "../../layouts/ui/Card";
import { Input } from "../../layouts/ui/Input";
import { Select } from "../../layouts/ui/Select";
import { useToast } from "../../layouts/ui/ToastProvider";
import { useConfirm } from "../../layouts/ui/ConfirmProvider";
import { usePageVisibility } from "../../hooks/usePageVisibility";
import {
  getSchedulerBundle,
  patchSchedulerConfig,
  scanAndEnqueue,
  type SchedulerMode,
  type SchedulerScope,
} from "../../api/scheduler";

function fmt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

function BoolBadge({
  value,
  toneTrue,
  toneFalse,
}: {
  value: boolean;
  toneTrue: any;
  toneFalse: any;
}) {
  return value ? (
    <Badge tone={toneTrue}>true</Badge>
  ) : (
    <Badge tone={toneFalse}>false</Badge>
  );
}

/** -----------------------------
 *  Cron Builder (5 campos)
 *  ----------------------------- */

type CronFieldKind = "any" | "every" | "list" | "range" | "rangeStep";

type CronFieldState =
  | { kind: "any" }
  | { kind: "every"; step: number } // */step
  | { kind: "list"; values: string } // "1,2,3"
  | { kind: "range"; start: number; end: number } // "a-b"
  | { kind: "rangeStep"; start: number; end: number; step: number }; // "a-b/step"

type CronState = {
  minute: CronFieldState;
  hour: CronFieldState;
  dom: CronFieldState; // day of month
  month: CronFieldState;
  dow: CronFieldState; // day of week (0-6)
};

const CRON_BOUNDS = {
  minute: { min: 0, max: 59, label: "Minuto" },
  hour: { min: 0, max: 23, label: "Hora" },
  dom: { min: 1, max: 31, label: "Dia do mês" },
  month: { min: 1, max: 12, label: "Mês" },
  dow: { min: 0, max: 6, label: "Dia da semana (0=Dom ... 6=Sáb)" },
} as const;

function defaultCronState(): CronState {
  return {
    minute: { kind: "every", step: 5 },
    hour: { kind: "any" },
    dom: { kind: "any" },
    month: { kind: "any" },
    dow: { kind: "any" },
  };
}

function clampInt(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function parseField(raw: string, min: number, max: number): CronFieldState | null {
  const s = raw.trim();

  if (s === "*") return { kind: "any" };

  const every = s.match(/^\*\/(\d+)$/);
  if (every) {
    const step = clampInt(Number(every[1]), 1, max - min + 1);
    return { kind: "every", step };
  }

  const rangeStep = s.match(/^(\d+)-(\d+)\/(\d+)$/);
  if (rangeStep) {
    const start = clampInt(Number(rangeStep[1]), min, max);
    const end = clampInt(Number(rangeStep[2]), min, max);
    const step = clampInt(Number(rangeStep[3]), 1, max - min + 1);
    return { kind: "rangeStep", start: Math.min(start, end), end: Math.max(start, end), step };
  }

  const range = s.match(/^(\d+)-(\d+)$/);
  if (range) {
    const start = clampInt(Number(range[1]), min, max);
    const end = clampInt(Number(range[2]), min, max);
    return { kind: "range", start: Math.min(start, end), end: Math.max(start, end) };
  }

  // list: "1,2,3" ou "7"
  const listOk = s.match(/^\d+(,\d+)*$/);
  if (listOk) return { kind: "list", values: s };

  return null; // formato fora do builder (aí cai em modo manual)
}

function fieldToString(
  field: CronFieldState,
  min: number,
  max: number,
): { value: string; errors: string[] } {
  const errors: string[] = [];

  const checkVal = (n: number) => {
    if (!Number.isInteger(n)) return false;
    return n >= min && n <= max;
  };

  if (field.kind === "any") return { value: "*", errors };

  if (field.kind === "every") {
    const step = Math.trunc(field.step);
    if (!checkVal(min + 0) || step < 1) errors.push("Passo inválido.");
    return { value: `*/${step}`, errors };
  }

  if (field.kind === "list") {
    const text = (field.values ?? "").trim();
    if (!text) {
      errors.push("Lista vazia.");
      return { value: "*", errors };
    }

    const parts = text.split(",");
    for (const p of parts) {
      const n = Number(p);
      if (!checkVal(n)) errors.push(`Valor fora do range (${min}-${max}): ${p}`);
    }
    return { value: text, errors };
  }

  if (field.kind === "range") {
    const start = Math.trunc(field.start);
    const end = Math.trunc(field.end);
    if (!checkVal(start) || !checkVal(end)) errors.push(`Intervalo inválido (${min}-${max}).`);
    return { value: `${Math.min(start, end)}-${Math.max(start, end)}`, errors };
  }

  if (field.kind === "rangeStep") {
    const start = Math.trunc(field.start);
    const end = Math.trunc(field.end);
    const step = Math.trunc(field.step);
    if (!checkVal(start) || !checkVal(end)) errors.push(`Intervalo inválido (${min}-${max}).`);
    if (step < 1) errors.push("Passo inválido.");
    return { value: `${Math.min(start, end)}-${Math.max(start, end)}/${step}`, errors };
  }

  return { value: "*", errors };
}

function buildCron(state: CronState) {
  const out: string[] = [];
  const errs: string[] = [];

  const m = fieldToString(state.minute, CRON_BOUNDS.minute.min, CRON_BOUNDS.minute.max);
  const h = fieldToString(state.hour, CRON_BOUNDS.hour.min, CRON_BOUNDS.hour.max);
  const dom = fieldToString(state.dom, CRON_BOUNDS.dom.min, CRON_BOUNDS.dom.max);
  const mon = fieldToString(state.month, CRON_BOUNDS.month.min, CRON_BOUNDS.month.max);
  const dow = fieldToString(state.dow, CRON_BOUNDS.dow.min, CRON_BOUNDS.dow.max);

  out.push(m.value, h.value, dom.value, mon.value, dow.value);

  errs.push(
    ...m.errors.map((e) => `Minuto: ${e}`),
    ...h.errors.map((e) => `Hora: ${e}`),
    ...dom.errors.map((e) => `Dia do mês: ${e}`),
    ...mon.errors.map((e) => `Mês: ${e}`),
    ...dow.errors.map((e) => `Dia da semana: ${e}`),
  );

  return { cron: out.join(" "), errors: errs };
}

function tryParseCronExpr(expr: string): CronState | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [mm, hh, dom, mon, dow] = parts;

  const m = parseField(mm, CRON_BOUNDS.minute.min, CRON_BOUNDS.minute.max);
  const h = parseField(hh, CRON_BOUNDS.hour.min, CRON_BOUNDS.hour.max);
  const d = parseField(dom, CRON_BOUNDS.dom.min, CRON_BOUNDS.dom.max);
  const mo = parseField(mon, CRON_BOUNDS.month.min, CRON_BOUNDS.month.max);
  const dw = parseField(dow, CRON_BOUNDS.dow.min, CRON_BOUNDS.dow.max);

  if (!m || !h || !d || !mo || !dw) return null;

  return { minute: m, hour: h, dom: d, month: mo, dow: dw };
}

function FieldEditor({
  title,
  desc,
  bounds,
  value,
  onChange,
}: {
  title: string;
  desc: string;
  bounds: { min: number; max: number };
  value: CronFieldState;
  onChange: (next: CronFieldState) => void;
}) {
  const kind = value.kind;

  function setKind(nextKind: CronFieldKind) {
    if (nextKind === "any") return onChange({ kind: "any" });
    if (nextKind === "every") return onChange({ kind: "every", step: 5 });
    if (nextKind === "list") return onChange({ kind: "list", values: "" });
    if (nextKind === "range") return onChange({ kind: "range", start: bounds.min, end: bounds.max });
    return onChange({ kind: "rangeStep", start: bounds.min, end: bounds.max, step: 5 });
  }

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div>
        <div className="text-sm font-medium text-gray-900">{title}</div>
        <div className="text-xs text-gray-500">{desc}</div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs font-medium text-gray-700">Modo</div>
          <div className="mt-1">
            <Select value={kind} onChange={(e) => setKind(e.target.value as CronFieldKind)}>
              <option value="any">*</option>
              <option value="every">*/N</option>
              <option value="list">lista (1,2,3)</option>
              <option value="range">intervalo (A-B)</option>
              <option value="rangeStep">intervalo c/ passo (A-B/N)</option>
            </Select>
          </div>
        </div>

        {kind === "every" && (
          <div>
            <div className="text-xs font-medium text-gray-700">A cada N</div>
            <div className="mt-1">
              <Input
                type="number"
                min={1}
                max={bounds.max - bounds.min + 1}
                value={(value as any).step}
                onChange={(e) =>
                  onChange({
                    kind: "every",
                    step: clampInt(Number(e.target.value), 1, bounds.max - bounds.min + 1),
                  })
                }
              />
            </div>
          </div>
        )}

        {kind === "list" && (
          <div className="sm:col-span-1">
            <div className="text-xs font-medium text-gray-700">Lista</div>
            <div className="mt-1">
              <Input
                value={(value as any).values}
                onChange={(e) => onChange({ kind: "list", values: e.target.value })}
                placeholder={`ex: ${bounds.min},${bounds.min + 1},${bounds.min + 2}`}
              />
            </div>
          </div>
        )}

        {kind === "range" && (
          <>
            <div>
              <div className="text-xs font-medium text-gray-700">Início</div>
              <div className="mt-1">
                <Input
                  type="number"
                  min={bounds.min}
                  max={bounds.max}
                  value={(value as any).start}
                  onChange={(e) =>
                    onChange({
                      kind: "range",
                      start: clampInt(Number(e.target.value), bounds.min, bounds.max),
                      end: (value as any).end,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-gray-700">Fim</div>
              <div className="mt-1">
                <Input
                  type="number"
                  min={bounds.min}
                  max={bounds.max}
                  value={(value as any).end}
                  onChange={(e) =>
                    onChange({
                      kind: "range",
                      start: (value as any).start,
                      end: clampInt(Number(e.target.value), bounds.min, bounds.max),
                    })
                  }
                />
              </div>
            </div>
          </>
        )}

        {kind === "rangeStep" && (
          <>
            <div>
              <div className="text-xs font-medium text-gray-700">Início</div>
              <div className="mt-1">
                <Input
                  type="number"
                  min={bounds.min}
                  max={bounds.max}
                  value={(value as any).start}
                  onChange={(e) =>
                    onChange({
                      kind: "rangeStep",
                      start: clampInt(Number(e.target.value), bounds.min, bounds.max),
                      end: (value as any).end,
                      step: (value as any).step,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-gray-700">Fim</div>
              <div className="mt-1">
                <Input
                  type="number"
                  min={bounds.min}
                  max={bounds.max}
                  value={(value as any).end}
                  onChange={(e) =>
                    onChange({
                      kind: "rangeStep",
                      start: (value as any).start,
                      end: clampInt(Number(e.target.value), bounds.min, bounds.max),
                      step: (value as any).step,
                    })
                  }
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="text-xs font-medium text-gray-700">Passo</div>
              <div className="mt-1">
                <Input
                  type="number"
                  min={1}
                  max={bounds.max - bounds.min + 1}
                  value={(value as any).step}
                  onChange={(e) =>
                    onChange({
                      kind: "rangeStep",
                      start: (value as any).start,
                      end: (value as any).end,
                      step: clampInt(Number(e.target.value), 1, bounds.max - bounds.min + 1),
                    })
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="text-[11px] text-gray-500">
        Range permitido: {bounds.min}–{bounds.max}
      </div>
    </div>
  );
}

/** -----------------------------
 *  Página Scheduler
 *  ----------------------------- */

export function SchedulerPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const visible = usePageVisibility();

  const bundleQuery = useQuery({
    queryKey: ["updates", "scheduler", "bundle"],
    queryFn: getSchedulerBundle,
    refetchInterval: visible ? 5_000 : false,
    retry: false,
  });

  const bundle = bundleQuery.data ?? null;
  const cfg = bundle?.config ?? null;
  const rt = bundle?.runtime ?? null;

  // form state
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<SchedulerMode>("scan_only");
  const [scope, setScope] = useState<SchedulerScope>("all");
  const [scanLabelKey, setScanLabelKey] = useState("docksentinel.scan");
  const [updateLabelKey, setUpdateLabelKey] = useState("docksentinel.update");

  // cron: builder + manual fallback
  const [cronManual, setCronManual] = useState(false);
  const [cronExpr, setCronExpr] = useState("*/5 * * * *"); // usado quando manual
  const [cronState, setCronState] = useState<CronState>(() => defaultCronState());

  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);

  // hydrate form on load/change
  useEffect(() => {
    if (!cfg) return;

    setEnabled(cfg.enabled);
    setMode(cfg.mode);
    setScope(cfg.scope);
    setScanLabelKey(cfg.scanLabelKey);
    setUpdateLabelKey(cfg.updateLabelKey);

    // cron: tenta parsear pro builder; se não der, cai no manual
    const parsed = tryParseCronExpr(cfg.cronExpr);
    if (parsed) {
      setCronManual(false);
      setCronState(parsed);
      setCronExpr(cfg.cronExpr); // mantém sincronizado
    } else {
      setCronManual(true);
      setCronExpr(cfg.cronExpr);
      setCronState(defaultCronState());
    }
  }, [cfg?.updatedAt]);

  const cronBuilt = useMemo(() => buildCron(cronState), [cronState]);

  const effectiveCron = cronManual ? cronExpr.trim() : cronBuilt.cron;

  const dirty = useMemo(() => {
    if (!cfg) return false;

    return (
      enabled !== cfg.enabled ||
      effectiveCron !== cfg.cronExpr ||
      mode !== cfg.mode ||
      scope !== cfg.scope ||
      scanLabelKey !== cfg.scanLabelKey ||
      updateLabelKey !== cfg.updateLabelKey
    );
  }, [cfg, enabled, effectiveCron, mode, scope, scanLabelKey, updateLabelKey]);

  async function handleSave() {
    if (!cfg || saving) return;

    // validação simples do cron (5 campos)
    const parts = effectiveCron.split(/\s+/).filter(Boolean);
    if (parts.length !== 5) {
      toast.error("Cron inválido: precisa ter 5 campos (min hour dom month dow).", "Scheduler");
      return;
    }

    if (!cronManual && cronBuilt.errors.length > 0) {
      toast.error("Cron inválido: ajuste os campos destacados.", "Scheduler");
      return;
    }

    setSaving(true);
    try {
      await patchSchedulerConfig({
        enabled,
        cronExpr: effectiveCron,
        mode,
        scope,
        scanLabelKey,
        updateLabelKey,
      });

      toast.success("Config salva e aplicada.", "Scheduler");
      await qc.invalidateQueries({ queryKey: ["updates", "scheduler", "bundle"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar config.", "Scheduler");
    } finally {
      setSaving(false);
    }
  }

  async function handleScanAndEnqueue() {
    const ok = await confirm.confirm({
      title: "Executar scan agora?",
      description:
        "Vai escanear containers e (dependendo da config do DB) enfileirar jobs. " +
        "Auto-update é ignorado quando label docksentinel.update=false.",
      confirmText: "Executar",
      cancelText: "Cancelar",
    });
    if (!ok) return;

    setScanning(true);
    try {
      await scanAndEnqueue();
      toast.success("Scan disparado.", "Updates");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["updates", "scheduler", "bundle"] }),
        qc.invalidateQueries({ queryKey: ["updates", "jobs"] }),
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao executar scan-and-enqueue.", "Updates");
    } finally {
      setScanning(false);
    }
  }

  const loading = bundleQuery.isLoading;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Scheduler</h1>
          <p className="mt-1 text-sm text-gray-600">
            Config + runtime (GET /updates/scheduler/scheduler). Auto-refresh:{" "}
            {visible ? "ON" : "OFF (aba oculta)"}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => bundleQuery.refetch()} disabled={bundleQuery.isFetching} type="button">
            Recarregar
          </Button>

          <Button
            variant="primary"
            onClick={handleScanAndEnqueue}
            disabled={loading || scanning}
            type="button"
          >
            {scanning ? "Executando..." : "Scan & enqueue"}
          </Button>
        </div>
      </div>

      {bundleQuery.isError && (
        <Card className="border-red-200 bg-red-50 px-4 py-3">
          <div className="text-sm text-red-700">
            Erro ao carregar Scheduler:{" "}
            {(bundleQuery.error as any)?.message ?? "desconhecido"}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* RUNTIME */}
        <Card className="lg:col-span-1">
          <CardHeader
            title="Runtime"
            subtitle="Status em tempo real"
            right={
              rt ? (
                rt.ticking ? <Badge tone="blue">ticking</Badge> : <Badge tone="green">idle</Badge>
              ) : (
                <Badge>—</Badge>
              )
            }
          />

          <div className="p-4 text-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-gray-600">hasJob</div>
              <div>{rt ? <BoolBadge value={!!rt.hasJob} toneTrue="blue" toneFalse="gray" /> : "—"}</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-gray-600">enabled (runtime)</div>
              <div>{rt ? <BoolBadge value={!!rt.enabled} toneTrue="green" toneFalse="gray" /> : "—"}</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-gray-600">ticking</div>
              <div>{rt ? <BoolBadge value={!!rt.ticking} toneTrue="blue" toneFalse="gray" /> : "—"}</div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-gray-600">nextScanAt</div>
              <div className="text-gray-900">{fmt(rt?.nextScanAt ?? null)}</div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-gray-600">lastFinishedAt</div>
              <div className="text-gray-900">{fmt(rt?.lastFinishedAt ?? null)}</div>
            </div>

            <div>
              <div className="text-gray-600">lastError</div>
              <div className="mt-1 text-xs text-gray-800 whitespace-pre-wrap wrap-break-word">
                {rt?.lastError ?? "—"}
              </div>
            </div>
          </div>
        </Card>

        {/* CONFIG */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Config"
            subtitle="Salvar via PATCH /updates/scheduler/config"
            right={
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!cfg || !dirty || saving}
                type="button"
              >
                {saving ? "Salvando..." : dirty ? "Salvar" : "Sem mudanças"}
              </Button>
            }
          />

          <div className="p-4 grid grid-cols-1 gap-4">
            {/* enabled */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">Enabled</div>
                  <div className="text-xs text-gray-500">Habilita o scheduler</div>
                </div>
              </label>

              {/* mode */}
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium text-gray-900">mode</div>
                <div className="mt-2">
                  <Select value={mode} onChange={(e) => setMode(e.target.value as SchedulerMode)}>
                    <option value="scan_only">scan_only</option>
                    <option value="scan_and_update">scan_and_update</option>
                  </Select>
                </div>
              </div>

              {/* scope */}
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium text-gray-900">scope</div>
                <div className="mt-2">
                  <Select value={scope} onChange={(e) => setScope(e.target.value as SchedulerScope)}>
                    <option value="all">all</option>
                    <option value="labeled">labeled</option>
                  </Select>
                </div>
              </div>

              {/* labels */}
              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium text-gray-900">scanLabelKey</div>
                <div className="mt-2">
                  <Input value={scanLabelKey} onChange={(e) => setScanLabelKey(e.target.value)} />
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-sm font-medium text-gray-900">updateLabelKey</div>
                <div className="mt-2">
                  <Input value={updateLabelKey} onChange={(e) => setUpdateLabelKey(e.target.value)} />
                </div>
              </div>
            </div>

            {/* CRON BUILDER */}
            <div className="rounded-xl border p-4 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">Agendamento (cron)</div>
                  <div className="text-xs text-gray-500">
                    O backend aceita cron normal com 5 campos: <span className="font-mono">min hour dom month dow</span>.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={cronManual ? "ghost" : "primary"}
                    onClick={() => setCronManual(false)}
                  >
                    Visual
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={cronManual ? "primary" : "ghost"}
                    onClick={() => setCronManual(true)}
                  >
                    Manual
                  </Button>
                </div>
              </div>

              {!cronManual ? (
                <div className="grid grid-cols-1 gap-3">
                  <FieldEditor
                    title="Minuto"
                    desc="0–59"
                    bounds={CRON_BOUNDS.minute}
                    value={cronState.minute}
                    onChange={(v) => setCronState((p) => ({ ...p, minute: v }))}
                  />
                  <FieldEditor
                    title="Hora"
                    desc="0–23"
                    bounds={CRON_BOUNDS.hour}
                    value={cronState.hour}
                    onChange={(v) => setCronState((p) => ({ ...p, hour: v }))}
                  />
                  <FieldEditor
                    title="Dia do mês"
                    desc="1–31"
                    bounds={CRON_BOUNDS.dom}
                    value={cronState.dom}
                    onChange={(v) => setCronState((p) => ({ ...p, dom: v }))}
                  />
                  <FieldEditor
                    title="Mês"
                    desc="1–12"
                    bounds={CRON_BOUNDS.month}
                    value={cronState.month}
                    onChange={(v) => setCronState((p) => ({ ...p, month: v }))}
                  />
                  <FieldEditor
                    title="Dia da semana"
                    desc="0–6 (0=Dom, 6=Sáb)"
                    bounds={CRON_BOUNDS.dow}
                    value={cronState.dow}
                    onChange={(v) => setCronState((p) => ({ ...p, dow: v }))}
                  />

                  <div className="rounded-lg bg-gray-50 border px-3 py-2">
                    <div className="text-xs text-gray-600">Preview</div>
                    <div className="mt-1 font-mono text-sm text-gray-900">
                      {cronBuilt.cron}
                    </div>

                    {cronBuilt.errors.length > 0 && (
                      <div className="mt-2 text-xs text-red-600 space-y-1">
                        {cronBuilt.errors.map((e, idx) => (
                          <div key={idx}>• {e}</div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 text-[11px] text-gray-500">
                      Exemplos:{" "}
                      <span className="font-mono">*/5 * * * *</span> (cada 5 min),{" "}
                      <span className="font-mono">0 3 * * *</span> (todo dia 03:00),{" "}
                      <span className="font-mono">0 9 * * 1</span> (seg 09:00).
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-gray-700">cronExpr (manual)</div>
                  <Input
                    value={cronExpr}
                    onChange={(e) => setCronExpr(e.target.value)}
                    placeholder="*/5 * * * *"
                  />
                  <div className="text-[11px] text-gray-500">
                    Dica: precisa ter 5 campos. Se você usar algo que o builder não entende, fica tudo bem — o backend só recebe a string.
                  </div>
                </div>
              )}
            </div>

            {/* extras do config */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3 text-sm">
                <div className="text-gray-600">config.running</div>
                <div className="mt-1">
                  {cfg ? <BoolBadge value={!!cfg.running} toneTrue="blue" toneFalse="gray" /> : "—"}
                </div>
              </div>

              <div className="rounded-lg border p-3 text-sm">
                <div className="text-gray-600">config.lastRunAt</div>
                <div className="mt-1 text-gray-900">{fmt(cfg?.lastRunAt ?? null)}</div>
              </div>

              <div className="rounded-lg border p-3 text-sm">
                <div className="text-gray-600">config.lockedAt</div>
                <div className="mt-1 text-gray-900">{fmt(cfg?.lockedAt ?? null)}</div>
              </div>

              <div className="rounded-lg border p-3 text-sm">
                <div className="text-gray-600">config.lockedBy</div>
                <div className="mt-1 font-mono text-xs text-gray-900 truncate">
                  {cfg?.lockedBy ?? "—"}
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              createdAt: <span className="font-mono">{cfg?.createdAt ?? "—"}</span>
              {" • "}
              updatedAt: <span className="font-mono">{cfg?.updatedAt ?? "—"}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
