import type { UpdateCheckResult } from "../api/types";

export function UpdateBadge({ check }: { check?: UpdateCheckResult }) {
  if (!check) {
    return <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">—</span>;
  }

  if (!check.canCheckLocal || !check.canCheckRemote) {
    return <span className="rounded-md bg-yellow-100 px-2 py-1 text-xs text-yellow-800">INDETERMINADO</span>;
  }

  if (check.hasUpdate) {
    return <span className="rounded-md bg-yellow-100 px-2 py-1 text-xs text-yellow-800">DISPONÍVEL</span>;
  }

  return <span className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-800">OK</span>;
}
