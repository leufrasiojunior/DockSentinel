import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  value: string | number | boolean | null | undefined;
}

function normalize(value: StatusBadgeProps["value"]) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value == null) return "unknown";
  return String(value);
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
  const normalized = normalize(value);
  return <Badge variant={resolveVariant(normalized)}>{normalized}</Badge>;
}

export { StatusBadge };
