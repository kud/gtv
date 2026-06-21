interface AppEntry {
  id: string
  name: string
  packageName: string
  // Optional explicit launch URI; defaults to the package-launch intent below.
  link?: string
}

// Curated Android TV apps. Launching uses market://launch?id=<package>, which
// the Play Store resolves to the installed app (or its store page if missing) —
// the most reliable method on Google TV, verified on a real device. Best-effort
// list; package names come from Play Store URLs and are easy to PR.
const APPS: AppEntry[] = [
  { id: "netflix", name: "Netflix", packageName: "com.netflix.ninja" },
  {
    id: "youtube",
    name: "YouTube",
    packageName: "com.google.android.youtube.tv",
  },
  {
    id: "primevideo",
    name: "Prime Video",
    packageName: "com.amazon.amazonvideo.livingroom",
  },
  { id: "plex", name: "Plex", packageName: "com.plexapp.android" },
  { id: "putio", name: "Put.io", packageName: "io.put.putio" },
  { id: "arte", name: "Arte", packageName: "tv.arte.plus7" },
  { id: "disney", name: "Disney+", packageName: "com.disney.disneyplus" },
  { id: "spotify", name: "Spotify", packageName: "com.spotify.tv.android" },
  { id: "twitch", name: "Twitch", packageName: "tv.twitch.android.app" },
  { id: "max", name: "Max", packageName: "com.wbd.stream" },
]

// The launch URI for an app. market://launch?id=<package> is handled by the
// Play Store and boots the installed app directly.
const appLink = (app: AppEntry): string =>
  app.link ?? `market://launch?id=${app.packageName}`

// Resolve a catalog id or display name (case-insensitive) to its entry.
const findApp = (query: string): AppEntry | undefined => {
  const q = query.trim().toLowerCase()
  return APPS.find((app) => app.id === q || app.name.toLowerCase() === q)
}

const listApps = (): AppEntry[] => APPS

export { APPS, findApp, listApps, appLink }
export type { AppEntry }
