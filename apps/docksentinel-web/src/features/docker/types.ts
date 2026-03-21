import { type UpdateCheckResult } from "./api/docker";

export type CheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "done"; result: UpdateCheckResult; checkedAt: string }
  | { status: "error"; error: string };

export type ContainerDetails = {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  env?: string[];
  labels?: Record<string, string>;
  restartPolicy?: { name?: string; maximumRetryCount?: number };
  ports?: Array<{ containerPort?: string; hostIp?: string; hostPort?: string }>;
  mounts?: Array<{
    type?: string;
    source?: string;
    target?: string;
    readOnly?: boolean;
  }>;
  networks?: Array<{
    name?: string;
    ipv4Address?: string;
    ipv6Address?: string;
    macAddress?: string;
  }>;
  [key: string]: unknown;
};

export type BusyState = {
  kind: "checkAll" | "updateSelected" | "scanOnly" | "scanAndUpdate";
  progressText: string;
} | null;
