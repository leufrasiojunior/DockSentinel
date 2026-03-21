import i18n from "../../../i18n";
import { getCurrentLocale } from "../../../i18n/format";

export type ScheduleEditorMode = "guided" | "advanced";
export type GuidedScheduleKind = "interval" | "daily" | "weekly" | "monthly";
export type GuidedIntervalUnit = "minutes" | "hours";

export type GuidedSchedule =
  | { kind: "interval"; every: number; unit: GuidedIntervalUnit }
  | { kind: "daily"; time: string }
  | { kind: "weekly"; time: string; days: number[] }
  | { kind: "monthly"; time: string; day: number };

export type SchedulePresetId =
  | "every-5m"
  | "every-15m"
  | "every-30m"
  | "every-1h"
  | "daily-03"
  | "weekdays-09"
  | "weekly"
  | "monthly";

export type SchedulePreset = {
  id: SchedulePresetId;
  label: string;
  description: string;
  schedule: GuidedSchedule;
};

const WEEKDAY_VALUES = [0, 1, 2, 3, 4, 5, 6] as const;
const PRESET_SCHEDULES: Array<{ id: SchedulePresetId; schedule: GuidedSchedule }> = [
  { id: "every-5m", schedule: { kind: "interval", every: 5, unit: "minutes" } },
  { id: "every-15m", schedule: { kind: "interval", every: 15, unit: "minutes" } },
  { id: "every-30m", schedule: { kind: "interval", every: 30, unit: "minutes" } },
  { id: "every-1h", schedule: { kind: "interval", every: 1, unit: "hours" } },
  { id: "daily-03", schedule: { kind: "daily", time: "03:00" } },
  { id: "weekdays-09", schedule: { kind: "weekly", time: "09:00", days: [1, 2, 3, 4, 5] } },
  { id: "weekly", schedule: { kind: "weekly", time: "09:00", days: [1] } },
  { id: "monthly", schedule: { kind: "monthly", time: "09:00", day: 1 } },
];

type TimeParts = {
  hours: number;
  minutes: number;
  valid: boolean;
};

const WEEKDAY_SET = new Set<number>(WEEKDAY_VALUES);
const WORKWEEK = [1, 2, 3, 4, 5];

function translate(key: string, options?: Record<string, unknown>) {
  return i18n.t(key as never, options as never) as unknown as string;
}

export function getWeekdayOptions() {
  return WEEKDAY_VALUES.map((value) => ({
    value,
    shortLabel: translate(`scheduler.cron.weekdays.${value}.short`),
    label: translate(`scheduler.cron.weekdays.${value}.long`),
  }));
}

export function getSchedulePresets(): SchedulePreset[] {
  return PRESET_SCHEDULES.map((preset) => ({
    ...preset,
    label: translate(`scheduler.cron.presets.${preset.id}.label`),
    description: translate(`scheduler.cron.presets.${preset.id}.description`),
  }));
}

export function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

export function hasFiveCronFields(expr: string) {
  return normalizeCronExpression(expr) !== null;
}

export function normalizeCronExpression(expr: string) {
  const normalized = String(expr ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  return normalized.split(" ").length === 5 ? normalized : null;
}

export function defaultGuidedSchedule(kind: GuidedScheduleKind = "interval"): GuidedSchedule {
  switch (kind) {
    case "interval":
      return { kind: "interval", every: 15, unit: "minutes" };
    case "daily":
      return { kind: "daily", time: "03:00" };
    case "weekly":
      return { kind: "weekly", time: "09:00", days: [1] };
    case "monthly":
      return { kind: "monthly", time: "09:00", day: 1 };
    default:
      return { kind: "interval", every: 15, unit: "minutes" };
  }
}

export function buildPresetSchedule(id: SchedulePresetId): GuidedSchedule {
  const preset = PRESET_SCHEDULES.find((item) => item.id === id);
  return normalizeGuidedSchedule(preset?.schedule ?? defaultGuidedSchedule());
}

export function normalizeGuidedSchedule(schedule: GuidedSchedule): GuidedSchedule {
  if (schedule.kind === "interval") {
    return {
      kind: "interval",
      every: clampInt(schedule.every, 1, schedule.unit === "minutes" ? 59 : 23),
      unit: schedule.unit,
    };
  }

  if (schedule.kind === "daily") {
    return {
      kind: "daily",
      time: normalizeTimeValue(schedule.time, "03:00"),
    };
  }

  if (schedule.kind === "weekly") {
    return {
      kind: "weekly",
      time: normalizeTimeValue(schedule.time, "09:00"),
      days: normalizeDays(schedule.days),
    };
  }

  return {
    kind: "monthly",
    time: normalizeTimeValue(schedule.time, "09:00"),
    day: clampInt(schedule.day, 1, 31),
  };
}

export function guidedScheduleToCron(schedule: GuidedSchedule) {
  const normalized = normalizeGuidedSchedule(schedule);
  const errors: string[] = [];

  if (normalized.kind === "interval") {
    if (normalized.unit === "minutes") {
      return { cron: `*/${normalized.every} * * * *`, errors };
    }

    return { cron: `0 */${normalized.every} * * *`, errors };
  }

  if (normalized.kind === "daily") {
    const time = parseTimeValue(normalized.time);
    if (!time.valid) {
      return { cron: "", errors: [translate("scheduler.errors.invalidSchedule")] };
    }

    return { cron: `${time.minutes} ${time.hours} * * *`, errors };
  }

  if (normalized.kind === "weekly") {
    const time = parseTimeValue(normalized.time);
    if (!time.valid) {
      errors.push(translate("scheduler.errors.invalidSchedule"));
    }
    if (normalized.days.length === 0) {
      errors.push(translate("scheduler.cron.weekdayError"));
    }

    if (errors.length > 0) {
      return { cron: "", errors };
    }

    return {
      cron: `${time.minutes} ${time.hours} * * ${normalized.days.join(",")}`,
      errors,
    };
  }

  const time = parseTimeValue(normalized.time);
  if (!time.valid) {
    return { cron: "", errors: [translate("scheduler.errors.invalidSchedule")] };
  }

  return {
    cron: `${time.minutes} ${time.hours} ${normalized.day} * *`,
    errors,
  };
}

export function tryParseGuidedSchedule(expr: string): GuidedSchedule | null {
  const normalized = normalizeCronExpression(expr);
  if (!normalized) return null;

  const [minute, hour, dom, month, dow] = normalized.split(" ");

  if (dom === "*" && month === "*" && dow === "*") {
    const minuteStep = parseStepToken(minute, 1, 59);
    if (minuteStep !== null && hour === "*") {
      return { kind: "interval", every: minuteStep, unit: "minutes" };
    }

    const minuteValue = parseNumberToken(minute, 0, 59);
    const hourStep = parseStepToken(hour, 1, 23);
    if (minuteValue === 0 && hourStep !== null) {
      return { kind: "interval", every: hourStep, unit: "hours" };
    }

    const hourValue = parseNumberToken(hour, 0, 23);
    if (minuteValue !== null && hourValue !== null) {
      return {
        kind: "daily",
        time: formatTimeParts(hourValue, minuteValue),
      };
    }
  }

  if (dom === "*" && month === "*") {
    const minuteValue = parseNumberToken(minute, 0, 59);
    const hourValue = parseNumberToken(hour, 0, 23);
    const days = parseNumberListToken(dow, 0, 6);

    if (minuteValue !== null && hourValue !== null && days && days.length > 0) {
      return {
        kind: "weekly",
        time: formatTimeParts(hourValue, minuteValue),
        days,
      };
    }
  }

  if (month === "*" && dow === "*") {
    const minuteValue = parseNumberToken(minute, 0, 59);
    const hourValue = parseNumberToken(hour, 0, 23);
    const dayValue = parseNumberToken(dom, 1, 31);

    if (minuteValue !== null && hourValue !== null && dayValue !== null) {
      return {
        kind: "monthly",
        time: formatTimeParts(hourValue, minuteValue),
        day: dayValue,
      };
    }
  }

  return null;
}

export function formatGuidedSchedule(schedule: GuidedSchedule) {
  const normalized = normalizeGuidedSchedule(schedule);

  if (normalized.kind === "interval") {
    if (normalized.unit === "minutes") {
      return normalized.every === 1
        ? translate("scheduler.cron.summaries.everyMinute")
        : translate("scheduler.cron.summaries.everyMinutes", { count: normalized.every });
    }

    return normalized.every === 1
      ? translate("scheduler.cron.summaries.everyHour")
      : translate("scheduler.cron.summaries.everyHours", { count: normalized.every });
  }

  if (normalized.kind === "daily") {
    return translate("scheduler.cron.summaries.everyDayAt", { time: normalized.time });
  }

  if (normalized.kind === "weekly") {
    if (normalized.days.length === 0) {
      return translate("scheduler.cron.summaries.chooseWeekday");
    }

    if (isWorkweek(normalized.days)) {
      return translate("scheduler.cron.summaries.weekdaysAt", { time: normalized.time });
    }

    const labels = normalized.days.reduce<string[]>((acc, day) => {
      const label = getWeekdayOptions().find((option) => option.value === day)?.label;
      if (label) acc.push(label);
      return acc;
    }, []);

    return translate("scheduler.cron.summaries.weeklyAt", {
      days: joinHumanList(labels),
      time: normalized.time,
    });
  }

  return translate("scheduler.cron.summaries.monthlyAt", {
    day: normalized.day,
    time: normalized.time,
  });
}

export function describeCronExpression(expr: string) {
  const normalized = normalizeCronExpression(expr);
  if (!normalized) {
    return {
      guidedSchedule: null,
      summary: translate("scheduler.cron.summaries.useFiveFields"),
      isCustom: true,
      isValid: false,
    };
  }

  const guidedSchedule = tryParseGuidedSchedule(normalized);
  if (guidedSchedule) {
    return {
      guidedSchedule,
      summary: formatGuidedSchedule(guidedSchedule),
      isCustom: false,
      isValid: true,
    };
  }

  return {
    guidedSchedule: null,
    summary: translate("scheduler.cron.summaries.custom"),
    isCustom: true,
    isValid: true,
  };
}

function parseTimeValue(value: string): TimeParts {
  const match = String(value ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return { hours: 0, minutes: 0, valid: false };
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const valid = hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;

  return {
    hours: valid ? hours : 0,
    minutes: valid ? minutes : 0,
    valid,
  };
}

function normalizeTimeValue(value: string, fallback: string) {
  const parsed = parseTimeValue(value);
  if (!parsed.valid) return fallback;
  return formatTimeParts(parsed.hours, parsed.minutes);
}

function formatTimeParts(hours: number, minutes: number) {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseNumberToken(token: string, min: number, max: number) {
  if (!/^\d+$/.test(token)) return null;
  const value = Number(token);
  return value >= min && value <= max ? value : null;
}

function parseStepToken(token: string, min: number, max: number) {
  const match = token.match(/^\*\/(\d+)$/);
  if (!match) return null;

  const value = Number(match[1]);
  return value >= min && value <= max ? value : null;
}

function parseNumberListToken(token: string, min: number, max: number) {
  const parts = token.split(",");
  const values = new Set<number>();

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) return null;

    const range = trimmed.match(/^(\d+)-(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start < min || end > max || start > end) return null;
      for (let value = start; value <= end; value += 1) {
        values.add(value);
      }
      continue;
    }

    const value = parseNumberToken(trimmed, min, max);
    if (value === null) return null;
    values.add(value);
  }

  return Array.from(values).sort((a, b) => a - b);
}

function normalizeDays(days: number[]) {
  return Array.from(new Set(days.filter((day) => WEEKDAY_SET.has(day)))).sort((a, b) => a - b);
}

function isWorkweek(days: number[]) {
  return days.length === WORKWEEK.length && WORKWEEK.every((day, index) => days[index] === day);
}

function joinHumanList(values: string[]) {
  if (values.length === 0) return "";
  return new Intl.ListFormat(getCurrentLocale(), {
    style: "long",
    type: "conjunction",
  }).format(values);
}
