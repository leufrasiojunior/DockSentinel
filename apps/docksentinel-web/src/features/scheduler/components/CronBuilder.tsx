import { Code2, SlidersHorizontal } from "lucide-react";

import { FormField } from "../../../components/product/form-field";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import {
  type CronFieldKind,
  type CronFieldState,
  type CronState,
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
    <Card className="border-border/60 bg-muted/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
        </div>
        <Badge variant="outline">
          {bounds.min}-{bounds.max}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Modo">
          <Select
            value={kind}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setKind(e.target.value as CronFieldKind)}
          >
            <option value="any">*</option>
            <option value="every">*/N</option>
            <option value="list">lista (1,2,3)</option>
            <option value="range">intervalo (A-B)</option>
            <option value="rangeStep">intervalo c/ passo (A-B/N)</option>
          </Select>
        </FormField>

        {kind === "every" ? (
          <FormField label="A cada N">
            <Input
              type="number"
              min={1}
              max={bounds.max - bounds.min + 1}
              value={(value as { step: number }).step}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange({
                  kind: "every",
                  step: clampInt(Number(e.target.value), 1, bounds.max - bounds.min + 1),
                })
              }
            />
          </FormField>
        ) : null}

        {kind === "list" ? (
          <FormField label="Lista" className="sm:col-span-2">
            <Input
              value={(value as { values: string }).values}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ kind: "list", values: e.target.value })
              }
              placeholder={`ex: ${bounds.min},${bounds.min + 1},${bounds.min + 2}`}
            />
          </FormField>
        ) : null}

        {kind === "range" ? (
          <>
            <FormField label="Início">
              <Input
                type="number"
                min={bounds.min}
                max={bounds.max}
                value={(value as { start: number }).start}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({
                    kind: "range",
                    start: clampInt(Number(e.target.value), bounds.min, bounds.max),
                    end: (value as { end: number }).end,
                  })
                }
              />
            </FormField>
            <FormField label="Fim">
              <Input
                type="number"
                min={bounds.min}
                max={bounds.max}
                value={(value as { end: number }).end}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({
                    kind: "range",
                    start: (value as { start: number }).start,
                    end: clampInt(Number(e.target.value), bounds.min, bounds.max),
                  })
                }
              />
            </FormField>
          </>
        ) : null}

        {kind === "rangeStep" ? (
          <>
            <FormField label="Início">
              <Input
                type="number"
                min={bounds.min}
                max={bounds.max}
                value={(value as { start: number }).start}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({
                    kind: "rangeStep",
                    start: clampInt(Number(e.target.value), bounds.min, bounds.max),
                    end: (value as { end: number }).end,
                    step: (value as { step: number }).step,
                  })
                }
              />
            </FormField>

            <FormField label="Fim">
              <Input
                type="number"
                min={bounds.min}
                max={bounds.max}
                value={(value as { end: number }).end}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({
                    kind: "rangeStep",
                    start: (value as { start: number }).start,
                    end: clampInt(Number(e.target.value), bounds.min, bounds.max),
                    step: (value as { step: number }).step,
                  })
                }
              />
            </FormField>

            <FormField label="Passo" className="sm:col-span-2">
              <Input
                type="number"
                min={1}
                max={bounds.max - bounds.min + 1}
                value={(value as { step: number }).step}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({
                    kind: "rangeStep",
                    start: (value as { start: number }).start,
                    end: (value as { end: number }).end,
                    step: clampInt(Number(e.target.value), 1, bounds.max - bounds.min + 1),
                  })
                }
              />
            </FormField>
          </>
        ) : null}
      </div>
    </Card>
  );
}

interface CronBuilderProps {
  cronManual: boolean;
  setCronManual: (v: boolean) => void;
  cronState: CronState;
  setCronState: React.Dispatch<React.SetStateAction<CronState>>;
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
    <div className="space-y-4 rounded-[1.75rem] border border-border/60 bg-muted/15 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">cron</Badge>
            <div className="text-sm font-semibold text-foreground">Agendamento</div>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
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
            <SlidersHorizontal className="size-4" />
            Visual
          </Button>
          <Button
            type="button"
            size="sm"
            variant={cronManual ? "primary" : "ghost"}
            onClick={() => setCronManual(true)}
          >
            <Code2 className="size-4" />
            Manual
          </Button>
        </div>
      </div>

      {!cronManual ? (
        <div className="grid grid-cols-1 gap-4">
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

          <Card className="border-border/60 bg-card/70 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Preview</div>
            <div className="mt-2 font-mono text-sm text-foreground">{cronBuilt.cron}</div>

            {cronBuilt.errors.length > 0 ? (
              <div className="mt-3 space-y-1 text-sm text-destructive">
                {cronBuilt.errors.map((error, idx) => (
                  <div key={idx}>{error}</div>
                ))}
              </div>
            ) : null}

            <div className="mt-4 text-xs text-muted-foreground">
              Exemplos: <span className="font-mono">*/5 * * * *</span>,{" "}
              <span className="font-mono">0 3 * * *</span>,{" "}
              <span className="font-mono">0 9 * * 1</span>.
            </div>
          </Card>
        </div>
      ) : (
        <FormField
          label="cronExpr (manual)"
          description="Se você usar algo que o builder não entende, tudo bem — o backend recebe a string literal."
        >
          <Input
            value={cronExpr}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCronExpr(e.target.value)}
            placeholder="*/5 * * * *"
          />
        </FormField>
      )}
    </div>
  );
}
