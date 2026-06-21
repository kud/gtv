<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![npm](https://img.shields.io/npm/v/%40kud%2Fgtv?style=flat-square&color=CB3837)
![MIT](https://img.shields.io/badge/licence-MIT-22C55E?style=flat-square)

**Google TV control library — device store, discovery, pairing, and a stateful remote session.**

[Features](#-features) • [Quick Start](#-quick-start) • [API Reference](#-api-reference) • [Development](#-development)

</div>

The framework-agnostic core of the Google TV stack — discovery, pairing, a stateful session, and a shared device store that every client (CLI, MCP, app) builds on.

## 🌟 Features

- 🔍 **mDNS Discovery** — finds every Google TV on the local network via `dns-sd`; returns pure data, no side effects
- 🔐 **Dependency-injected Pairing** — `onSecret` is a callback you supply (terminal `readline`, MCP round-trip, Tauri dialog…); the library never touches I/O itself
- 📡 **Stateful Session** — `createSession()` returns an `EventEmitter` that reduces the underlying protocol stream to a single observable `SessionState`; subscribe with `.on("change", state => …)`
- ⚡ **One-shot Helpers** — `sendKey`, `launchApp`, `connect`, `withRemote` for scripts that don't need a long-lived connection
- 📱 **App Catalog** — curated `APPS` list with `findApp`, `listApps`, and `appLink` (builds the reliable `market://launch?id=<package>` URI)
- 🗄️ **Shared Config Store** — reads and writes `~/.config/gtv/config.json`; all consumers (`gtv-cli`, `mcp-gtv`, `gtv-app`) share one device registry
- 🔑 **Full Keycode Surface** — `KEYS`, `KEY_LABELS`, and re-exported `RemoteKeyCode` / `RemoteDirection` so consumers need only depend on `@kud/gtv`

## 🚀 Quick Start

```sh
npm install @kud/gtv
```

### Discover and pair

```ts
import { discover, pair } from "@kud/gtv"

const [tv] = await discover()

await pair({
  host: tv.host,
  hostname: tv.hostname,
  port: tv.port,
  name: tv.name,
  onSecret: async () => promptUserForPin(), // PIN displayed on the TV screen
})
```

### Drive a stateful session

```ts
import { createSession, KEYS } from "@kud/gtv"

const session = createSession() // uses the currently configured device
session.on("change", (state) => console.log(state))

session.sendKey(KEYS.home)
session.typeText("interstellar")
session.launchApp("market://launch?id=com.netflix.ninja")
session.stop()
```

### One-shot commands

```ts
import { sendKey, launchApp, findApp, appLink, KEYS } from "@kud/gtv"

await sendKey(KEYS.mute)

const netflix = findApp("netflix")
if (netflix) await launchApp(appLink(netflix))
```

## 📖 API Reference

### Discovery

| Export     | Signature                           | Description                                         |
| ---------- | ----------------------------------- | --------------------------------------------------- |
| `discover` | `() => Promise<DiscoveredDevice[]>` | mDNS scan; returns every Google TV found on the LAN |

### Pairing

| Export | Signature                                       | Description                                                         |
| ------ | ----------------------------------------------- | ------------------------------------------------------------------- |
| `pair` | `(options: PairOptions) => Promise<PairResult>` | Full pairing flow; `onSecret` is called with the PIN entry callback |

`PairOptions`:

| Field      | Type                           | Required | Description                                     |
| ---------- | ------------------------------ | -------- | ----------------------------------------------- |
| `host`     | `string`                       | ✓        | IP address of the TV                            |
| `hostname` | `string`                       |          | Hostname (from mDNS)                            |
| `port`     | `number`                       |          | Remote port (default `6466`)                    |
| `name`     | `string`                       |          | Friendly device name                            |
| `onSecret` | `() => Promise<string>`        | ✓        | Resolves the PIN shown on screen                |
| `onStatus` | `(status: PairStatus) => void` |          | Progress callback                               |
| `save`     | `boolean`                      |          | Persist device to config store (default `true`) |

### Session

| Export          | Signature                      | Description                         |
| --------------- | ------------------------------ | ----------------------------------- |
| `createSession` | `(device?: Device) => Session` | Long-lived, event-driven connection |

`Session` extends `EventEmitter`:

| Member             | Type                                            | Description                                                  |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------ |
| `state`            | `SessionState`                                  | Current snapshot (connected, powered, volume, currentApp, …) |
| `sendKey`          | `(keyCode: number, direction?: number) => void` | Send a remote keypress                                       |
| `typeText`         | `(text: string) => void`                        | IME text input                                               |
| `launchApp`        | `(link: string) => void`                        | Open an app by URI                                           |
| `stop`             | `() => void`                                    | Tear down the connection                                     |
| `on("change", cb)` | —                                               | Fires on every state update                                  |
| `on("error", cb)`  | —                                               | Fires on connection errors                                   |

### One-shot helpers

| Export                                  | Description                                      |
| --------------------------------------- | ------------------------------------------------ |
| `connect(device?)`                      | Opens a raw `AndroidRemote`, resolves when ready |
| `withRemote(fn, device?)`               | Runs `fn(remote)` then closes the connection     |
| `sendKey(keyCode, direction?, device?)` | One-shot key send                                |
| `launchApp(link, device?)`              | One-shot app launch                              |

### App catalog

| Export     | Signature                                  | Description                                                             |
| ---------- | ------------------------------------------ | ----------------------------------------------------------------------- |
| `APPS`     | `AppEntry[]`                               | Curated list (Netflix, YouTube, Prime Video, Plex, Disney+, Spotify, …) |
| `listApps` | `() => AppEntry[]`                         | Returns `APPS`                                                          |
| `findApp`  | `(query: string) => AppEntry \| undefined` | Case-insensitive match on `id` or display name                          |
| `appLink`  | `(app: AppEntry) => string`                | Builds `market://launch?id=<package>` URI                               |

### Config store

Config lives at `~/.config/gtv/config.json` and is shared across all consumers.

| Export                    | Description                      |
| ------------------------- | -------------------------------- |
| `readConfig`              | Read the full config file        |
| `listDevices`             | All paired devices               |
| `getCurrentDevice`        | The active device                |
| `findDevice(query)`       | Find by host, name, or hostname  |
| `upsertDevice(device)`    | Insert or update a device entry  |
| `setCurrentDevice(host)`  | Mark a device as active          |
| `removeDevices(hosts)`    | Delete one or more devices       |
| `readPreferences`         | Read the preferences block       |
| `writePreferences(prefs)` | Write the preferences block      |
| `CONFIG_PATH`             | Absolute path to the config file |

### Keycodes

| Export            | Description                                     |
| ----------------- | ----------------------------------------------- |
| `KEYS`            | Map of friendly names → `RemoteKeyCode` values  |
| `KEY_LABELS`      | Map of `RemoteKeyCode` values → display strings |
| `RemoteKeyCode`   | Re-export from `@kud/androidtv-remote`          |
| `RemoteDirection` | Re-export from `@kud/androidtv-remote`          |
| `setDebug`        | Enable protocol-level debug logging             |

## 🔧 Development

```
gtv/
├── src/
│   ├── index.ts        # Public surface
│   ├── session.ts      # Stateful Session (EventEmitter)
│   ├── client.ts       # One-shot helpers
│   ├── discovery.ts    # mDNS via dns-sd
│   ├── pairing.ts      # Pairing flow
│   ├── config.ts       # Device store + preferences
│   ├── apps.ts         # App catalog + appLink
│   ├── keycodes.ts     # KEYS / KEY_LABELS
│   └── types.ts        # SessionState, VolumeState
└── dist/               # Compiled output (tsup)
```

```sh
git clone https://github.com/kud/gtv.git
cd gtv
npm install
npm run build
```

| Script                | Description                 |
| --------------------- | --------------------------- |
| `npm run build`       | Compile with tsup           |
| `npm run build:watch` | Compile in watch mode       |
| `npm run typecheck`   | Type-check without emitting |
| `npm run clean`       | Delete `dist/`              |

**Node.js ≥ 22** required.

## 🏗 Tech Stack

| Package                                                            | Role                                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| [`@kud/androidtv-remote`](https://github.com/kud/androidtv-remote) | Protocol layer — TLS socket, protobuf codec, key/text/app-link send |
| [`tsup`](https://github.com/egoist/tsup)                           | Zero-config ESM bundler                                             |
| [`typescript`](https://www.typescriptlang.org/)                    | Type safety across the entire public API                            |

---

MIT © [kud](https://github.com/kud) — Made with ❤️
