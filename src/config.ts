import fs from "node:fs"
import path from "node:path"

const CONFIG_PATH = path.join(
  process.env["HOME"] ?? "~",
  ".config",
  "gtv",
  "config.json",
)

type Cert = { key: string; cert: string }

type Device = {
  host: string
  port?: number
  name?: string
  cert?: Cert
}

type IconStyle = "nerd" | "emoji" | "text"

type Preferences = {
  iconStyle: IconStyle
}

type Store = {
  version: 2
  currentHost: string | null
  devices: Device[]
  preferences?: Preferences
}

// Kept as an alias so single-device call sites read naturally.
type Config = Device

const DEFAULT_PREFERENCES: Preferences = { iconStyle: "text" }

const emptyStore = (): Store => ({ version: 2, currentHost: null, devices: [] })

const isLegacyConfig = (raw: unknown): raw is Device =>
  typeof raw === "object" &&
  raw !== null &&
  "host" in raw &&
  !("devices" in raw)

const readStore = (): Store => {
  if (!fs.existsSync(CONFIG_PATH)) return emptyStore()

  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as unknown

  if (isLegacyConfig(raw)) {
    return { version: 2, currentHost: raw.host, devices: [raw] }
  }

  const store = raw as Partial<Store>
  const devices = store.devices ?? []
  return {
    version: 2,
    currentHost: store.currentHost ?? devices[0]?.host ?? null,
    devices,
    ...(store.preferences ? { preferences: store.preferences } : {}),
  }
}

const writeStore = (store: Store): void => {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(store, null, 2) + "\n")
}

const listDevices = (): Device[] => readStore().devices

const getCurrentDevice = (): Device | null => {
  const store = readStore()
  return (
    store.devices.find((device) => device.host === store.currentHost) ??
    store.devices[0] ??
    null
  )
}

const findDevice = (query: string): Device | null => {
  const needle = query.toLowerCase()
  return (
    listDevices().find(
      (device) =>
        device.host === query || device.name?.toLowerCase() === needle,
    ) ?? null
  )
}

const upsertDevice = (
  device: Device,
  { makeCurrent = true }: { makeCurrent?: boolean } = {},
): void => {
  const store = readStore()
  const existing = store.devices.find((d) => d.host === device.host)
  const merged: Device = existing
    ? { ...existing, ...device, cert: device.cert ?? existing.cert }
    : device

  const devices = existing
    ? store.devices.map((d) => (d.host === device.host ? merged : d))
    : [...store.devices, merged]

  writeStore({
    ...store,
    currentHost: makeCurrent ? device.host : (store.currentHost ?? device.host),
    devices,
  })
}

const setCurrentDevice = (host: string): boolean => {
  const store = readStore()
  if (!store.devices.some((device) => device.host === host)) return false
  writeStore({ ...store, currentHost: host })
  return true
}

const deleteConfig = (): boolean => {
  if (!fs.existsSync(CONFIG_PATH)) return false
  fs.unlinkSync(CONFIG_PATH)
  return true
}

const removeDevices = (hosts: string[]): void => {
  const store = readStore()
  const devices = store.devices.filter((device) => !hosts.includes(device.host))

  if (devices.length === 0) {
    deleteConfig()
    return
  }

  const currentHost = devices.some(
    (device) => device.host === store.currentHost,
  )
    ? store.currentHost
    : devices[0]!.host

  writeStore({ ...store, currentHost, devices })
}

const readPreferences = (): Preferences => ({
  ...DEFAULT_PREFERENCES,
  ...readStore().preferences,
})

const writePreferences = (partial: Partial<Preferences>): Preferences => {
  const store = readStore()
  const preferences = {
    ...DEFAULT_PREFERENCES,
    ...store.preferences,
    ...partial,
  }
  writeStore({ ...store, preferences })
  return preferences
}

const readConfig = (): Config | null => getCurrentDevice()

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
  type Config,
  type Device,
  type Cert,
  type Store,
  type Preferences,
  type IconStyle,
}
