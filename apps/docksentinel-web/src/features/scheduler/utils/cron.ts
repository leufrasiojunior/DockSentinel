export type CronFieldKind = "any" | "every" | "list" | "range" | "rangeStep";

export type CronFieldState =
  | { kind: "any" }
  | { kind: "every"; step: number } // */step
  | { kind: "list"; values: string } // "1,2,3"
  | { kind: "range"; start: number; end: number } // "a-b"
  | { kind: "rangeStep"; start: number; end: number; step: number }; // "a-b/step"

export type CronState = {
  minute: CronFieldState;
  hour: CronFieldState;
  dom: CronFieldState; // day of month
  month: CronFieldState;
  dow: CronFieldState; // day of week (0-6)
};

export const CRON_BOUNDS = {
  minute: { min: 0, max: 59, label: "Minuto" },
  hour: { min: 0, max: 23, label: "Hora" },
  dom: { min: 1, max: 31, label: "Dia do mês" },
  month: { min: 1, max: 12, label: "Mês" },
  dow: { min: 0, max: 6, label: "Dia da semana (0=Dom ... 6=Sáb)" },
} as const;

export function defaultCronState(): CronState {
  return {
    minute: { kind: "every", step: 5 },
    hour: { kind: "any" },
    dom: { kind: "any" },
    month: { kind: "any" },
    dow: { kind: "any" },
  };
}

export function clampInt(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export function parseField(raw: string, min: number, max: number): CronFieldState | null {
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

  const listOk = s.match(/^\d+(,\d+)*$/);
  if (listOk) return { kind: "list", values: s };

  return null;
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
    if (step < 1) errors.push("Passo inválido.");
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

export function buildCronExpr(state: CronState) {
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

export function tryParseCronExpr(expr: string): CronState | null {
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
