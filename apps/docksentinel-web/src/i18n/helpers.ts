import type { TFunction } from "i18next";
import type { AuthMode } from "../features/auth/api/auth";
import type { JobFilter } from "../features/jobs/hooks/useJobs";
import type { NotificationLevel } from "../features/settings/api/settings";
import type { SchedulerMode, SchedulerScope } from "../features/scheduler/api/scheduler";
import type { Locale } from "./locale";

export function getAuthModeLabel(t: TFunction, mode: AuthMode) {
  return t(`common.authModes.${mode}`);
}

export function getSchedulerModeLabel(t: TFunction, mode: SchedulerMode) {
  if (mode === "scan_and_update" || mode === "scan_only") {
    return t(`common.schedulerModes.${mode}`);
  }
  return mode;
}

export function getSchedulerScopeLabel(t: TFunction, scope: SchedulerScope) {
  if (scope === "all" || scope === "labeled") {
    return t(`common.schedulerScopes.${scope}`);
  }
  return scope;
}

export function getNotificationLevelLabel(t: TFunction, level: NotificationLevel) {
  return t(`common.notificationLevels.${level}`);
}

export function getJobFilterLabel(t: TFunction, filter: JobFilter) {
  return t(`jobs.filters.${filter}`);
}

export function getLocaleLabel(t: TFunction, locale: Locale) {
  return t(`common.locales.${locale}`);
}
