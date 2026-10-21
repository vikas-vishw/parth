# Parth

Parth is an AI chief-of-staff companion for adults: a static desk device with a 3.5" smart-display
face, two microphones, a speaker, a Bluetooth module for phone calls and Matter over Wi-Fi. This
repository holds the cloud, the gateway, the device simulator, the developer console and the app.

**The wire contract does not exist yet.** Document B-P is written in the next phase, and
`packages/shared/src/gateway-contract/` is **deliberately absent** until then — no directory, no
stub, no placeholder type. Nothing in this repository names a B-P message, field, enum or topic.

**`.reference/xelulu` is read-only.** It is a clone of the sibling product and the source of most
of this repository. It is never edited, never imported from, and it is git-ignored. Every ported
file names the path it came from in its header comment.

## Layers

Every source file carries a one-line header naming its layer: `contract`, `platform` or
`product`. A `platform` file may not import from a `product` path, and the check that enforces it
is `tooling/checks/layer.ts`. Repo infrastructure carries no label. The rules and the reasoning
live in `.kiro/steering/structure.md`; the always-on steering pack is `.kiro/steering/`.

## Prerequisites

| Tool           | Version              | Note                                                                                                                |
| -------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Node           | **24.21.0**, exactly | `engines.node` is exact, so pnpm refuses any other patch. A portable copy lives in `.tools/`, which is git-ignored. |
| pnpm           | **10.34.6**, exactly | `corepack enable && corepack prepare pnpm@10.34.6 --activate`                                                       |
| Docker Compose | **2.24.0 or later**  | Needed for the `env_file` long syntax with `required: false`.                                                       |

If you use the portable toolchain in `.tools/`, three environment values are needed, not one —
`pnpm` hangs with only `PATH` set, because corepack tries to fetch:

```
# PowerShell
$env:Path = "$PWD\.tools\node-v24.21.0-win-x64;" + $env:Path
$env:COREPACK_HOME = "$PWD\.tools\corepack"
$env:COREPACK_ENABLE_NETWORK = "0"
```

Otherwise use `nvm use`, `fnm use` or `volta pin` to match `.nvmrc`.

## Commands

```
pnpm install          # install; --frozen-lockfile in CI
pnpm build            # every package: tsc, or a type-check for the app
pnpm lint             # one ESLint flat config, --max-warnings=0
pnpm format:check     # Prettier, check only
pnpm test             # build, type-check the test project, Vitest, then the app's own test
docker compose up     # EMQX plus the gateway and the simulator
```

Every command runs unchanged on Windows, macOS and Linux. The one exception is the copy step
below, which has a form for each.

## The connection panel

`.env.example` is the single panel: every key, URL and port the system needs, each in a labelled
box, each empty. **It is never filled in place.** Copy the local defaults instead:

```
Copy-Item .env.local.example .env      # PowerShell
cp .env.local.example .env             # POSIX
```

`tooling/fixtures/approved-panel.txt` is a byte-for-byte copy of the panel, and a repo check
compares them, so a key cannot be added, removed, reordered or given a value unnoticed. Secrets
show in the app as "set" or "not set", never as a value.

`docker compose up` works with no `.env` at all: the Compose file carries the local defaults.

## The local stack

`docker compose up` starts three services: EMQX, the gateway and the simulator. At P0 the two
services start, log one line, idle, and stop cleanly on a signal. **They connect to nothing** —
the control plane and the audio plane arrive with the contract.

**EMQX is pinned to 5.8.9 and the pin does not move.** 5.8.9 is Apache-2.0; **5.9.0 and later are
BSL 1.1**, which is not an open-source licence for a product we sell. Any bump past 5.8.x is a
licence decision, not a maintenance task.

**The EMQX dashboard credentials are the image defaults.** They are for local development only,
they are never reused anywhere, and no EMQX port is ever exposed beyond `127.0.0.1` — except the
two device-facing ports, 1883 and 8883, and only when `DEVICE_BIND_HOST` is set to `0.0.0.0` so a
physical device on the LAN can reach them. That setting never opens the console or the panel.

EMQX ports: 1883 MQTT, 8883 MQTTS, 8083 MQTT-over-WS, 8084 MQTT-over-WSS, 18083 dashboard.

## Documents

`docs/` holds what this repository is built to: the master build guide, the pairing and
device-session contract, the software spec, the feature catalogue and the hardware BOM.
`docs/founder-steps.md` is the only place a manual step for the founder may appear.
