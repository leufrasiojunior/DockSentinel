import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageVisibility } from "../../../hooks/usePageVisibility";
import { listJobs } from "../api/jobs";

export type JobFilter = "all" | "queued" | "running" | "done" | "failed";

export function useJobs() {
  const visible = usePageVisibility();
  const [filter, setFilter] = useState<JobFilter>("all");

  const jobsQuery = useQuery({
    queryKey: ["updates", "jobs"],
    queryFn: listJobs,
    refetchInterval: visible ? 4_000 : false,
    retry: false,
  });

  const jobs = jobsQuery.data ?? [];

  const counters = useMemo(() => {
    const c = {
      queued: 0,
      running: 0,
      done: 0,
      failed: 0,
      total: jobs.length,
    };

    for (const j of jobs) {
      const s = String(j.status ?? "").toLowerCase();
      if (s.includes("queue")) c.queued++;
      else if (s.includes("run")) c.running++;
      else if (s.includes("fail")) c.failed++;
      else if (s.includes("done") || s.includes("success")) c.done++;
    }
    return c;
  }, [jobs]);

  const filtered = useMemo(() => {
    if (filter === "all") return jobs;
    return jobs.filter((j) =>
      String(j.status ?? "").toLowerCase().includes(filter),
    );
  }, [jobs, filter]);

  return {
    jobs,
    filtered,
    counters,
    filter,
    setFilter,
    loading: jobsQuery.isLoading,
    isFetching: jobsQuery.isFetching,
    refetch: jobsQuery.refetch,
    visible,
  };
}
