# Changelog

## Unreleased — 2026-07-12

### Highlights

- The app catalog grew from 10 to 19 launchable apps. The standouts are three self-hosted media players — Jellyfin, Kodi, and VLC — plus two music apps, YouTube Music and Deezer, both using their dedicated Android TV package names rather than the phone app IDs. Four streaming services also joined: Apple TV, Crunchyroll, Paramount+, and Peacock. ([f0e7cb4](https://github.com/kud/gtv/commit/f0e7cb41d1452d1cb9696a86424af0645cedcd97))

---

## v0.1.3 - 2026-07-10

### Highlights

- **More reliable pairing and connection to Google TV devices.** Bumped `@kud/androidtv-remote` to 0.1.2, which pins connections to IPv4 — clearing up the `EHOSTUNREACH` failures some setups hit from scopeless IPv6 link-local addresses — and retries pairing when a TV is dozing in Wi-Fi power-save and slow to respond. If pairing or connecting has ever failed intermittently, this release should fix it.

### Internal

- Added a Vitest test suite with a Prettier config and a CI workflow to run it on every change. ([db7fb1c](https://github.com/kud/gtv/commit/db7fb1c9c9a78afc72ff862054fe13d2d606efe9))
- Fixed the npm publish workflow's OIDC trusted-publisher pattern. ([0de388d](https://github.com/kud/gtv/commit/0de388d3e10a68d36d9e8fb5a60ac6539f3a2050))
- Rewrote the docs index as an orientation page rather than a README copy, and tidied its title and landing lede. ([d0c28d3](https://github.com/kud/gtv/commit/d0c28d34976c960884458e94bd45f6b098bfaff6))

---
