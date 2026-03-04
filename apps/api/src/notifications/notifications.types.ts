export type NotificationLevel = "info" | "error"

export type NotificationEventType =
  | "job_success"
  | "job_failed"
  | "scan_info"
  | "scan_error"
  | "system_error"

export type JobNotificationPayload = {
  jobId: string
  status: "success" | "failed"
  container: string
  image?: string | null
  finishedAt: string
  error?: string | null
}

export type GenericNotificationPayload = Record<string, unknown>
