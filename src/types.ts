import type { VolumeState } from "@kud/androidtv-remote"

interface SessionState {
  tvName: string | null
  host: string | null
  connected: boolean
  powered: boolean | null
  volume: VolumeState | null
  currentApp: string | null
  error: string | null
}

export type { SessionState, VolumeState }
