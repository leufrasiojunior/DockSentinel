import { Button } from "../../../shared/components/ui/Button";
import { Input } from "../../../shared/components/ui/Input";
import { Select } from "../../../shared/components/ui/Select";
import {
  type CronState,
  type CronFieldState,
  type CronFieldKind,
  CRON_BOUNDS,
  clampInt,
} from "../utils/cron";

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

interface CronBuilderProps {
  cronManual: boolean;
  setCronManual: (v: boolean) => void;
  cronState: CronState;
  setCronState: (v: any) => void;
  cronBuilt: { cron: string; errors: string[] };
  cronExpr: string;
  setCronExpr: (v: string) => void;
}

export function CronBuilder({
  cronManual,
  setCronManual,
  cronState,
  setCronState,
  cronBuilt,
  cronExpr,
  setCronExpr,
}: CronBuilderProps) {
  return (
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
            onChange={(v) => setCronState((p: CronState) => ({ ...p, minute: v }))}
          />
          <FieldEditor
            title="Hora"
            desc="0–23"
            bounds={CRON_BOUNDS.hour}
            value={cronState.hour}
            onChange={(v) => setCronState((p: CronState) => ({ ...p, hour: v }))}
          />
          <FieldEditor
            title="Dia do mês"
            desc="1–31"
            bounds={CRON_BOUNDS.dom}
            value={cronState.dom}
            onChange={(v) => setCronState((p: CronState) => ({ ...p, dom: v }))}
          />
          <FieldEditor
            title="Mês"
            desc="1–12"
            bounds={CRON_BOUNDS.month}
            value={cronState.month}
            onChange={(v) => setCronState((p: CronState) => ({ ...p, month: v }))}
          />
          <FieldEditor
            title="Dia da semana"
            desc="0–6 (0=Dom, 6=Sáb)"
            bounds={CRON_BOUNDS.dow}
            value={cronState.dow}
            onChange={(v) => setCronState((p: CronState) => ({ ...p, dow: v }))}
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
  );
}
