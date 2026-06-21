# @kud/gtv

The Google TV control library — device store, mDNS discovery, pairing, and a stateful remote session. Framework-agnostic (no React, no CLI), built on [`@kud/androidtv-remote`](https://github.com/kud/androidtv-remote).

This is the shared core behind [`gtv-cli`](https://github.com/kud/gtv-cli) (terminal remote), with `mcp-gtv` (MCP server) and `gtv-app` (Tauri desktop remote) consuming the same API.

## Install

```sh
npm install @kud/gtv
```

## Usage

### Pair a TV

```ts
import { discover, pair } from "@kud/gtv"

const [tv] = await discover()
await pair({
  host: tv.host,
  hostname: tv.hostname,
  port: tv.port,
  name: tv.name,
  onSecret: async () => promptUserForPin(), // PIN shown on the TV
})
```

### Drive a stateful session

```ts
import { createSession, KEYS } from "@kud/gtv"

const session = createSession() // uses the current configured device
session.on("change", (state) => render(state))

session.sendKey(KEYS.home)
session.typeText("interstellar")
// …
session.stop()
```

### One-shot commands

```ts
import { sendKey, launchApp, KEYS } from "@kud/gtv"

await sendKey(KEYS.mute)
await launchApp("https://www.netflix.com/")
```

## API

- **Config / store** — `readConfig`, `listDevices`, `getCurrentDevice`, `findDevice`, `upsertDevice`, `setCurrentDevice`, `removeDevices`, `readPreferences`, `writePreferences`, `CONFIG_PATH`
- **Discovery** — `discover()` → `DiscoveredDevice[]` (pure data)
- **Pairing** — `pair(options)` with injected `onSecret` / `onStatus`
- **Session** — `createSession(device?)` → `Session` (emits `change` / `error`)
- **One-shot** — `connect`, `withRemote`, `sendKey`, `launchApp`
- **Keycodes** — `KEYS`, `KEY_LABELS`, plus re-exported `RemoteKeyCode` / `RemoteDirection`

Config lives at `~/.config/gtv/config.json` (shared across all consumers).

## License

MIT
