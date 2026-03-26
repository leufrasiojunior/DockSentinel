export const LOCAL_ENVIRONMENT_ID = "local"
export const LOCAL_ENVIRONMENT_NAME = "Local"
export const AGENT_DEFAULT_PORT = 45873
export const ENVIRONMENT_ROTATION_STATES = [
  "unpaired",
  "paired",
  "pending_rotation",
  "ready_to_complete",
] as const

export type EnvironmentRotationState = (typeof ENVIRONMENT_ROTATION_STATES)[number]
