// Protocol enums + debug toggle, re-exported so consumers need only depend on @kud/gtv.
export { RemoteKeyCode, RemoteDirection, setDebug } from "@kud/androidtv-remote"

// Device store + preferences
export {
  readConfig,
  readStore,
  listDevices,
  getCurrentDevice,
  findDevice,
  upsertDevice,
  setCurrentDevice,
  removeDevices,
  deleteConfig,
  readPreferences,
  writePreferences,
  CONFIG_PATH,
} from "./config.js"
export type { Config, Device, Cert, Store, Preferences } from "./config.js"

// Keycodes
export { KEYS, KEY_LABELS } from "./keycodes.js"

// One-shot commands
export { connect, withRemote, sendKey, launchApp } from "./client.js"

// Stateful session
export { createSession } from "./session.js"
export type { Session } from "./session.js"
export type { SessionState, VolumeState } from "./types.js"

// Discovery
export { discover } from "./discovery.js"
export type { DiscoveredDevice } from "./discovery.js"

// Pairing
export { pair } from "./pairing.js"
export type { PairOptions, PairResult, PairStatus } from "./pairing.js"
