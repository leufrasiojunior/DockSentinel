import * as React from "react";
import { Clock3, Code2 } from "lucide-react";

import { EmptyState } from "../../../components/product/empty-state";
import { FormField } from "../../../components/product/form-field";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { cn } from "../../../lib/utils";
import {
  type GuidedSchedule,
  type GuidedScheduleKind,
  type ScheduleEditorMode,
  WEEKDAY_OPTIONS,
  buildPresetSchedule,
  clampInt,
  defaultGuidedSchedule,
  describeCronExpression,
  formatGuidedSchedule,
  guidedScheduleToCron,
  hasFiveCronFields,
  type SchedulePreset,
  SCHEDULE_PRESETS,
} from "../utils/cron";

interface CronBuilderProps {
  scheduleMode: ScheduleEditorMode;
  setScheduleMode: (mode: ScheduleEditorMode) => void;
  guidedSchedule: GuidedSchedule | null;
  setGuidedSchedule: React.Dispatch<React.SetStateAction<GuidedSchedule | null>>;
  cronExpr: string;
  setCronExpr: (value: string) => void;
  effectiveCron: string;
  timeZone?: string | null;
}

const SCHEDULE_KIND_OPTIONS: Array<{ value: GuidedScheduleKind; label: string; description: string }> = [
  {
    value: "interval",
    label: "Intervalo",
    description: "Repete a cada X minutos ou horas.",
  },
  {
    value: "daily",
    label: "Diário",
    description: "Executa todos os dias em um horário fixo.",
  },
  {
    value: "weekly",
    label: "Semanal",
    description: "Permite escolher um ou mais dias da semana.",
  },
  {
    value: "monthly",
    label: "Mensal",
    description: "Executa uma vez por mês no dia escolhido.",
  },
];

function buildScheduleForKind(kind: GuidedScheduleKind, current: GuidedSchedule | null) {
  if (kind === "weekly" && current?.kind === "weekly") {
    return {
      kind: "weekly" as const,
      time: current.time,
      days: current.days.length > 0 ? current.days : [1],
    };
  }

  if (kind === "monthly" && current?.kind === "monthly") {
    return {
      kind: "monthly" as const,
      time: current.time,
      day: current.day,
    };
  }

  if (kind === "daily" && current?.kind === "daily") {
    return {
      kind: "daily" as const,
      time: current.time,
    };
  }

  return defaultGuidedSchedule(kind);
}

function GuidedPresetButton({
  preset,
  active,
  onClick,
}: {
  preset: SchedulePreset;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-3xl border p-4 text-left transition-all duration-200",
        active
          ? "border-primary/35 bg-primary/8 shadow-[0_18px_40px_-30px_color-mix(in_oklab,var(--color-primary)_70%,transparent)]"
          : "border-border/60 bg-card/70 hover:-translate-y-0.5 hover:border-border hover:bg-card",
      )}
    >
      <div className="text-sm font-semibold text-foreground">{preset.label}</div>
      <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{preset.description}</div>
    </button>
  );
}

export function CronBuilder({
  scheduleMode,
  setScheduleMode,
  guidedSchedule,
  setGuidedSchedule,
  cronExpr,
  setCronExpr,
  effectiveCron,
  timeZone,
}: CronBuilderProps) {
  const guidedBuild = React.useMemo(
    () =>
      guidedSchedule
        ? guidedScheduleToCron(guidedSchedule)
        : { cron: "", errors: ["Escolha uma recorrência para gerar o cron."] },
    [guidedSchedule],
  );

  const preview = React.useMemo(() => {
    if (scheduleMode === "guided") {
      return {
        summary: guidedSchedule ? formatGuidedSchedule(guidedSchedule) : "Selecione uma recorrência guiada",
        isCustom: false,
        isValid: Boolean(guidedSchedule) && guidedBuild.errors.length === 0,
      };
    }

    return describeCronExpression(effectiveCron);
  }, [effectiveCron, guidedBuild.errors.length, guidedSchedule, scheduleMode]);

  const activePresetCron = guidedSchedule ? guidedScheduleToCron(guidedSchedule).cron : null;
  const advancedPreview = React.useMemo(() => describeCronExpression(cronExpr), [cronExpr]);
  const needsGuidedSelection = scheduleMode === "guided" && guidedSchedule === null;
  const isCustomAdvanced = scheduleMode === "advanced" && advancedPreview.isCustom && advancedPreview.isValid;

  function updateGuidedSchedule(next: GuidedSchedule) {
    setGuidedSchedule(next);
  }

  function selectKind(kind: GuidedScheduleKind) {
    setGuidedSchedule((current) => buildScheduleForKind(kind, current));
  }

  function toggleWeekday(day: number) {
    setGuidedSchedule((current) => {
      if (!current || current.kind !== "weekly") {
        return {
          kind: "weekly",
          time: "09:00",
          days: [day],
        };
      }

      const exists = current.days.includes(day);
      const nextDays = exists ? current.days.filter((value) => value !== day) : [...current.days, day];
      return {
        ...current,
        days: nextDays.sort((left, right) => left - right),
      };
    });
  }

  return (
    <div className="space-y-6 rounded-[1.9rem] border border-border/60 bg-muted/15 p-5 sm:p-6">
      <Tabs value={scheduleMode} onValueChange={(value) => setScheduleMode(value as ScheduleEditorMode)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge variant="info">Agendamento</Badge>
              <div className="text-sm font-semibold text-foreground">Quando executar</div>
            </div>
            <div className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Use presets para chegar rápido em uma recorrência comum e, se precisar, abra o cron avançado
              para editar a expressão manualmente.
            </div>
          </div>

          <TabsList>
            <TabsTrigger value="guided">
              <Clock3 className="size-4" />
              Guiado
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Code2 className="size-4" />
              Cron avançado
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="guided" className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-medium text-foreground">Presets rápidos</div>
              <Badge variant="outline">1 clique</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {SCHEDULE_PRESETS.map((preset) => {
                const presetCron = guidedScheduleToCron(buildPresetSchedule(preset.id)).cron;
                const active = Boolean(activePresetCron) && activePresetCron === presetCron;

                return (
                  <GuidedPresetButton
                    key={preset.id}
                    preset={preset}
                    active={active}
                    onClick={() => updateGuidedSchedule(buildPresetSchedule(preset.id))}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">Tipo de recorrência</div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {SCHEDULE_KIND_OPTIONS.map((option) => {
                const active = guidedSchedule?.kind === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectKind(option.value)}
                    className={cn(
                      "rounded-3xl border p-4 text-left transition-all duration-200",
                      active
                        ? "border-primary/35 bg-primary/8"
                        : "border-border/60 bg-card/70 hover:-translate-y-0.5 hover:border-border hover:bg-card",
                    )}
                  >
                    <div className="text-sm font-semibold text-foreground">{option.label}</div>
                    <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{option.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {needsGuidedSelection ? (
            <EmptyState
              icon={Clock3}
              title="Seu cron atual é customizado"
              description="Para voltar ao modo guiado, escolha um preset ou um tipo de recorrência. Ao salvar, a nova escolha substitui a expressão manual atual."
            />
          ) : null}

          {guidedSchedule ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {guidedSchedule.kind === "interval" ? (
                <>
                  <FormField label="Repetir a cada" description="Defina a frequência do scheduler.">
                    <Input
                      type="number"
                      min={1}
                      max={guidedSchedule.unit === "minutes" ? 59 : 23}
                      value={guidedSchedule.every}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        updateGuidedSchedule({
                          ...guidedSchedule,
                          every: clampInt(
                            Number(event.target.value),
                            1,
                            guidedSchedule.unit === "minutes" ? 59 : 23,
                          ),
                        })
                      }
                    />
                  </FormField>

                  <FormField label="Unidade" description="Minutos para alta frequência, horas para rotinas mais espaçadas.">
                    <Select
                      value={guidedSchedule.unit}
                      onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                        updateGuidedSchedule({
                          ...guidedSchedule,
                          unit: event.target.value as "minutes" | "hours",
                          every: clampInt(
                            guidedSchedule.every,
                            1,
                            event.target.value === "minutes" ? 59 : 23,
                          ),
                        })
                      }
                    >
                      <option value="minutes">minutos</option>
                      <option value="hours">horas</option>
                    </Select>
                  </FormField>
                </>
              ) : null}

              {guidedSchedule.kind === "daily" ? (
                <FormField
                  label="Horário"
                  description="Use a timezone ativa do scheduler para interpretar esse horário."
                  className="lg:max-w-xs"
                >
                  <Input
                    type="time"
                    value={guidedSchedule.time}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      updateGuidedSchedule({
                        ...guidedSchedule,
                        time: event.target.value,
                      })
                    }
                  />
                </FormField>
              ) : null}

              {guidedSchedule.kind === "weekly" ? (
                <>
                  <FormField
                    label="Horário"
                    description="O mesmo horário será usado em todos os dias selecionados."
                    className="lg:max-w-xs"
                  >
                    <Input
                      type="time"
                      value={guidedSchedule.time}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        updateGuidedSchedule({
                          ...guidedSchedule,
                          time: event.target.value,
                        })
                      }
                    />
                  </FormField>

                  <FormField
                    label="Dias da semana"
                    description="Selecione um ou mais dias."
                    error={guidedSchedule.days.length === 0 ? "Escolha pelo menos um dia." : undefined}
                    className="lg:col-span-2"
                  >
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_OPTIONS.map((day) => {
                        const active = guidedSchedule.days.includes(day.value);

                        return (
                          <Button
                            key={day.value}
                            type="button"
                            size="sm"
                            variant={active ? "primary" : "subtle"}
                            onClick={() => toggleWeekday(day.value)}
                          >
                            {day.shortLabel}
                          </Button>
                        );
                      })}
                    </div>
                  </FormField>
                </>
              ) : null}

              {guidedSchedule.kind === "monthly" ? (
                <>
                  <FormField label="Dia do mês" description="Valor entre 1 e 31.">
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={guidedSchedule.day}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        updateGuidedSchedule({
                          ...guidedSchedule,
                          day: clampInt(Number(event.target.value), 1, 31),
                        })
                      }
                    />
                  </FormField>

                  <FormField
                    label="Horário"
                    description="A execução mensal respeita a timezone atual do scheduler."
                    className="lg:max-w-xs"
                  >
                    <Input
                      type="time"
                      value={guidedSchedule.time}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        updateGuidedSchedule({
                          ...guidedSchedule,
                          time: event.target.value,
                        })
                      }
                    />
                  </FormField>
                </>
              ) : null}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card className="border-border/60 bg-muted/20">
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={isCustomAdvanced ? "warning" : "outline"}>
                  {isCustomAdvanced ? "Cron customizado" : "Cron manual"}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  O backend continua recebendo uma expressão cron com 5 campos:{" "}
                  <span className="font-mono text-foreground">min hour dom month dow</span>.
                </div>
              </div>

              <FormField
                label="Expressão cron"
                description="Se a expressão bater com um padrão conhecido, ao voltar para o modo guiado os campos serão preenchidos automaticamente."
                error={!hasFiveCronFields(cronExpr) ? "Use 5 campos separados por espaço." : undefined}
              >
                <Input
                  value={cronExpr}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => setCronExpr(event.target.value)}
                  placeholder="*/15 * * * *"
                  spellCheck={false}
                />
              </FormField>

              {isCustomAdvanced ? (
                <div className="rounded-3xl border border-amber-500/20 bg-amber-500/8 p-4 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                  Esse cron atual não cabe no fluxo guiado. Se você quiser voltar para a experiência simples,
                  escolha um preset ou um tipo de recorrência antes de salvar.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-primary/15 bg-primary/5">
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">Preview do agendamento</div>
              <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Resumo humano, expressão cron gerada e timezone efetiva do scheduler.
              </div>
            </div>

            <Badge variant={preview.isCustom ? "warning" : "info"}>
              {preview.isCustom ? "Customizado" : "Guiado"}
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl border border-border/60 bg-background/70 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Resumo</div>
              <div className="mt-2 text-sm font-medium text-foreground">{preview.summary}</div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-background/70 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cron</div>
              <div className="mt-2 break-all font-mono text-sm text-foreground">
                {effectiveCron || "—"}
              </div>
            </div>

            <div className="rounded-3xl border border-border/60 bg-background/70 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Timezone</div>
              <div className="mt-2 break-all font-mono text-sm text-foreground">
                {timeZone ?? "UTC"}
              </div>
            </div>
          </div>

          {!preview.isValid ? (
            <div className="text-sm font-medium text-destructive">
              {scheduleMode === "guided"
                ? guidedBuild.errors[0] ?? "Ajuste a recorrência para gerar um cron válida."
                : "Ajuste a expressão cron antes de salvar."}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
