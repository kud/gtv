import { beforeEach, describe, expect, it, vi } from "vitest"

// config.ts persists to a single JSON file via node:fs. We fake the
// filesystem in memory so the suite is deterministic, offline, and never
// touches the real ~/.config/gtv/config.json on the machine running it.
const virtualFile: { exists: boolean; content: string } = {
  exists: false,
  content: "",
}

vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(() => virtualFile.exists),
    readFileSync: vi.fn(() => virtualFile.content),
    writeFileSync: vi.fn((_path: string, content: string) => {
      virtualFile.exists = true
      virtualFile.content = content
    }),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn(() => {
      virtualFile.exists = false
      virtualFile.content = ""
    }),
  },
}))

const {
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
} = await import("./config.js")

const seed = (store: unknown): void => {
  virtualFile.exists = true
  virtualFile.content = JSON.stringify(store)
}

beforeEach(() => {
  virtualFile.exists = false
  virtualFile.content = ""
})

describe("readStore", () => {
  it("returns an empty store when no config file exists", () => {
    expect(readStore()).toEqual({
      version: 2,
      currentHost: null,
      devices: [],
    })
  })

  it("migrates a legacy single-device config into the v2 shape", () => {
    seed({ host: "10.0.0.5", name: "Lounge" })

    expect(readStore()).toEqual({
      version: 2,
      currentHost: "10.0.0.5",
      devices: [{ host: "10.0.0.5", name: "Lounge" }],
    })
  })

  it("falls back to the first device's host when currentHost is missing", () => {
    seed({ devices: [{ host: "10.0.0.5" }, { host: "10.0.0.6" }] })

    expect(readStore().currentHost).toBe("10.0.0.5")
  })

  it("preserves preferences only when present", () => {
    seed({ devices: [], preferences: { theme: "dark" } })
    expect(readStore().preferences).toEqual({ theme: "dark" })

    seed({ devices: [] })
    expect(readStore().preferences).toBeUndefined()
  })
})

describe("upsertDevice", () => {
  it("adds a new device and makes it current by default", () => {
    upsertDevice({ host: "10.0.0.5", name: "Lounge" })

    expect(listDevices()).toEqual([{ host: "10.0.0.5", name: "Lounge" }])
    expect(getCurrentDevice()).toEqual({ host: "10.0.0.5", name: "Lounge" })
  })

  it("merges into an existing device, keeping its cert if the update omits one", () => {
    seed({
      version: 2,
      currentHost: "10.0.0.5",
      devices: [
        {
          host: "10.0.0.5",
          name: "Lounge",
          cert: { key: "k", cert: "c" },
        },
      ],
    })

    upsertDevice({ host: "10.0.0.5", name: "Lounge (renamed)" })

    expect(getCurrentDevice()).toEqual({
      host: "10.0.0.5",
      name: "Lounge (renamed)",
      cert: { key: "k", cert: "c" },
    })
  })

  it("does not steal currentHost from an existing store when makeCurrent is false", () => {
    seed({
      version: 2,
      currentHost: "10.0.0.5",
      devices: [{ host: "10.0.0.5" }],
    })

    upsertDevice({ host: "10.0.0.9" }, { makeCurrent: false })

    expect(readStore().currentHost).toBe("10.0.0.5")
    expect(listDevices().map((d) => d.host)).toEqual(["10.0.0.5", "10.0.0.9"])
  })
})

describe("findDevice", () => {
  beforeEach(() => {
    seed({
      version: 2,
      currentHost: "10.0.0.5",
      devices: [
        { host: "10.0.0.5", name: "Lounge" },
        { host: "10.0.0.6", name: "Bedroom" },
      ],
    })
  })

  it("matches by exact host", () => {
    expect(findDevice("10.0.0.6")?.name).toBe("Bedroom")
  })

  it("matches by name, case-insensitively", () => {
    expect(findDevice("lounge")?.host).toBe("10.0.0.5")
  })

  it("returns null when nothing matches", () => {
    expect(findDevice("nope")).toBeNull()
  })
})

describe("setCurrentDevice", () => {
  it("returns false and leaves the store untouched for an unknown host", () => {
    seed({
      version: 2,
      currentHost: "10.0.0.5",
      devices: [{ host: "10.0.0.5" }],
    })

    expect(setCurrentDevice("10.0.0.9")).toBe(false)
    expect(readStore().currentHost).toBe("10.0.0.5")
  })

  it("switches the current host when it exists", () => {
    seed({
      version: 2,
      currentHost: "10.0.0.5",
      devices: [{ host: "10.0.0.5" }, { host: "10.0.0.6" }],
    })

    expect(setCurrentDevice("10.0.0.6")).toBe(true)
    expect(readStore().currentHost).toBe("10.0.0.6")
  })
})

describe("removeDevices", () => {
  it("deletes the config file entirely once the last device is removed", () => {
    seed({
      version: 2,
      currentHost: "10.0.0.5",
      devices: [{ host: "10.0.0.5" }],
    })

    removeDevices(["10.0.0.5"])

    expect(deleteConfig()).toBe(false) // already gone
    expect(readStore()).toEqual({ version: 2, currentHost: null, devices: [] })
  })

  it("reassigns currentHost when the removed device was current", () => {
    seed({
      version: 2,
      currentHost: "10.0.0.5",
      devices: [{ host: "10.0.0.5" }, { host: "10.0.0.6" }],
    })

    removeDevices(["10.0.0.5"])

    const store = readStore()
    expect(store.devices).toEqual([{ host: "10.0.0.6" }])
    expect(store.currentHost).toBe("10.0.0.6")
  })

  it("leaves currentHost untouched when a different device was removed", () => {
    seed({
      version: 2,
      currentHost: "10.0.0.5",
      devices: [{ host: "10.0.0.5" }, { host: "10.0.0.6" }],
    })

    removeDevices(["10.0.0.6"])

    expect(readStore().currentHost).toBe("10.0.0.5")
  })
})

describe("preferences", () => {
  it("reads an empty object when none are stored", () => {
    expect(readPreferences()).toEqual({})
  })

  it("merges written preferences on top of existing ones", () => {
    writePreferences({ theme: "dark" })
    writePreferences({ iconStyle: "outline" })

    expect(readPreferences()).toEqual({ theme: "dark", iconStyle: "outline" })
  })
})
