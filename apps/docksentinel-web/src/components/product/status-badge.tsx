import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface StatusBadgeProps {
  value: string | number | boolean | null | undefined;
}

function normalize(value: StatusBadgeProps["value"]) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value == null) return "unknown";
  return String(value);
}

function translateStatusValue(value: string, translate: (key: string) => string) {
  const lower = value.toLowerCase();

  if (lower.includes("queue")) return translate("common.statusValues.queued");
  if (lower.includes("run")) return translate("common.statusValues.running");
  if (lower.includes("fail")) return translate("common.statusValues.failed");
  if (lower.includes("done")) return translate("common.statusValues.done");
  if (lower.includes("success")) return translate("common.statusValues.success");
  if (lower.includes("error")) return translate("common.statusValues.error");
  if (lower.includes("blocked")) return translate("common.statusValues.blocked");
  if (lower.includes("checking")) return translate("common.statusValues.checking");
  if (lower.includes("progress")) return translate("common.statusValues.progress");
  if (lower.includes("tick")) return translate("common.statusValues.tick");
  if (lower === "true") return translate("common.statusValues.true");
  if (lower === "false") return translate("common.statusValues.false");
  if (lower === "unknown") return translate("common.statusValues.unknown");

  return value;
}

function resolveVariant(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("error") || lower.includes("fail") || lower.includes("false") || lower.includes("blocked")) {
    return "destructive";
  }
  if (lower.includes("run") || lower.includes("tick") || lower.includes("progress") || lower.includes("checking")) {
    return "info";
  }
  if (lower.includes("done") || lower.includes("success") || lower.includes("true") || lower.includes("update")) {
    return "success";
  }
  if (lower.includes("queue") || lower.includes("pending") || lower.includes("warn")) {
    return "warning";
  }
  return "neutral";
}

function StatusBadge({ value }: StatusBadgeProps) {
  const { t } = useTranslation();
  const normalized = normalize(value);
  const tr = (key: string) => t(key as never) as string;
  return <Badge variant={resolveVariant(normalized)}>{translateStatusValue(normalized, tr)}</Badge>;
}

export { StatusBadge };
