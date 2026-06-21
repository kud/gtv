import { createAndroidRemote, type AndroidRemote } from "@kud/androidtv-remote"
import { readConfig } from "./config.js"

const CONNECT_TIMEOUT_MS = 8000

// Opens a connection to the current device and resolves once it is ready.
// Used for one-shot commands that connect, act, and disconnect.
const connect = (): Promise<AndroidRemote> => {
  const config = readConfig()
  if (!config) throw new Error("No TV configured. Run `gtv pair` first.")

  const remote = createAndroidRemote(config.host, {
    pairing_port: 6467,
    remote_port: config.port ?? 6466,
    service_name: config.name ?? "gtv",
    ...(config.cert ? { cert: config.cert } : {}),
  })

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      remote.stop()
      reject(
        new Error(
          `Timed out connecting to ${config.host}. Run \`gtv pair\` again if the TV is online.`,
        ),
      )
    }, CONNECT_TIMEOUT_MS)

    const fail = (error: Error) => {
      clearTimeout(timeout)
      remote.stop()
      reject(error)
    }

    remote.once("ready", () => {
      clearTimeout(timeout)
      resolve(remote)
    })
    remote.once("unpaired", () =>
      fail(new Error("TV rejected the saved pairing. Run `gtv pair` again.")),
    )
    remote.once("error", fail)
    remote
      .start()
      .then((started) => {
        if (!started)
          fail(
            new Error(
              `Could not connect to ${config.host}. Check that remote control is enabled on the TV.`,
            ),
          )
      })
      .catch(fail)
  })
}

const withRemote = async (
  fn: (remote: AndroidRemote) => void,
): Promise<void> => {
  const remote = await connect()
  try {
    fn(remote)
    await new Promise((r) => setTimeout(r, 300))
  } finally {
    remote.stop()
  }
}

const sendKey = (keyCode: number): Promise<void> =>
  withRemote((remote) => remote.sendKey(keyCode))

const launchApp = (deeplink: string): Promise<void> =>
  withRemote((remote) => remote.sendAppLink(deeplink))

export { connect, withRemote, sendKey, launchApp }
