// platform: static checks for the local Compose stack and the dev-only local env copy. Ported from .reference/xelulu/tooling/test/compose-static.test.ts
// Parses `docker-compose.yml` with `yaml` (the raw text is kept for the comment assertions) and
// reads each service Dockerfile's FROM line to check the Node major against `.nvmrc`.
//
// It also pins `.env.local.example`, the tracked dev-only copy of the same Local_Mode values, to
// the Compose defaults below. Secret_Check allows those ten keys to carry a value in exactly two
// files, so this is where what the values ARE is checked: a real credential pasted into either
// file fails here.
//
// NARROWED AT P0 from the ported original, in three places, each restored at P2 with the
// listeners that justify it: neither Node service publishes a port, neither has a healthcheck,
// and the simulator therefore waits on EMQX alone rather than on a healthy gateway. The key-set
// assertion drops from eight keys to six, which is what makes those three absences enforced
// rather than merely true.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const COMPOSE_PATH = join(ROOT, "docker-compose.yml");
const LOCAL_ENV_PATH = join(ROOT, ".env.local.example");

const EXPECTED_SERVICES = ["emqx", "gateway", "simulator"];
const EMQX_PORTS = [1883, 8883, 8083, 8084, 18083];
const NODE_SERVICES = ["gateway", "simulator"] as const;
type NodeService = (typeof NODE_SERVICES)[number];

/** The one host reference the device-facing publishes may use. Its default keeps them closed. */
const BIND_REFERENCE = "${DEVICE_BIND_HOST:-127.0.0.1}";

/** Each Node service runs its image's default command plus the bind argument, and nothing else. */
const NODE_SERVICE_COMMAND: Record<NodeService, readonly string[]> = {
  gateway: ["node", "dist/index.js", "--listen-all-interfaces"],
  simulator: ["node", "dist/index.js", "--listen-all-interfaces"],
};

type EnvEntry = readonly [key: string, fallback: string | null];
const DEVICE_TOKEN_DEFAULT = "dev_local_only_not_a_secret";
const DEVICE_ID_DEFAULT = "prt_000123";
const SHARED_SERVICE_ENV: readonly EnvEntry[] = [
  ["APP_ENV", "local"],
  ["MQTT_BROKER_URL", "mqtt://emqx:1883"],
  ["AUDIO_WSS_URL", "ws://gateway:8081"],
  ["DEVICE_ID", DEVICE_ID_DEFAULT],
  ["DEVICE_TOKEN", DEVICE_TOKEN_DEFAULT],
];
// The broker credential is the one key the two services must NOT share. Anonymous access is off,
// so the gateway carries its own default; the simulator keeps the bare form, and a null (unset or
// empty) credential is exactly what makes it authenticate as the device with DEVICE_ID and
// DEVICE_TOKEN. Giving the simulator the cloud default would let the device impersonate the cloud.
const GATEWAY_BROKER_ENV: readonly EnvEntry[] = [
  ["MQTT_USERNAME", "parth_gateway_dev"],
  ["MQTT_PASSWORD", "dev_gateway_only_not_a_secret"],
];
const DEVICE_BROKER_ENV: readonly EnvEntry[] = [
  ["MQTT_USERNAME", null],
  ["MQTT_PASSWORD", null],
];
const NODE_SERVICE_ENV: Record<NodeService, readonly EnvEntry[]> = {
  gateway: [
    SHARED_SERVICE_ENV[0] as EnvEntry,
    SHARED_SERVICE_ENV[1] as EnvEntry,
    ...GATEWAY_BROKER_ENV,
    ...SHARED_SERVICE_ENV.slice(2),
    ["GATEWAY_OPERATOR_PORT", "8090"],
  ],
  simulator: [
    SHARED_SERVICE_ENV[0] as EnvEntry,
    SHARED_SERVICE_ENV[1] as EnvEntry,
    ...DEVICE_BROKER_ENV,
    ...SHARED_SERVICE_ENV.slice(2),
    ["SIMULATOR_PANEL_PORT", "8091"],
  ],
};

/** `${KEY:-default}`, or the bare `${KEY}` when there is no default. */
function envRef([key, fallback]: EnvEntry): string {
  return fallback === null ? "${" + key + "}" : "${" + key + ":-" + fallback + "}";
}

function expectedEnvironment(name: NodeService): Record<string, string> {
  return Object.fromEntries(NODE_SERVICE_ENV[name].map((e) => [e[0], envRef(e)]));
}

/**
 * What `.env.local.example` must assign: every key both services declare, with the Compose
 * default as its value (the bare-reference keys mean no value, so empty). Derived from the same
 * tuples the Compose assertions use, so the two files cannot drift apart.
 */
function expectedLocalEnv(): ReadonlyMap<string, string> {
  const expected = new Map<string, string>();
  // DEVICE_BIND_HOST first: it is interpolated into `ports:`, not into any service environment,
  // so the service tuples never mention it, but a copied example must still carry it - closed.
  expected.set("DEVICE_BIND_HOST", "127.0.0.1");
  for (const name of NODE_SERVICES) {
    // The gateway is iterated first and the simulator second, so where the two disagree the
    // DEVICE value wins. That is deliberate: copying this file must not hand the simulator the
    // cloud credential, so the example carries the empty broker credential, not the gateway one.
    for (const [key, fallback] of NODE_SERVICE_ENV[name]) expected.set(key, fallback ?? "");
  }
  return expected;
}

/**
 * `KEY=value` lines of a dotenv file, in order. Blank and comment lines are skipped; any other
 * line that is not an assignment fails the parse, so nothing can hide in this file.
 */
function parseEnvFile(text: string): readonly (readonly [string, string])[] {
  const out: (readonly [string, string])[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (match?.[1] === undefined) {
      throw new Error(`.env.local.example line ${i + 1} is neither a comment nor an assignment`);
    }
    out.push([match[1], (match[2] ?? "").trim()]);
  }
  return out;
}

/**
 * Every key a Node service may carry at P0, sorted. Each one is pinned by its own assertion
 * below, so pinning the key SET closes the file off: a `ports`, `healthcheck`, `volumes` or
 * `labels` entry - any new key at all - fails here until it is added deliberately. `ports` and
 * `healthcheck` return at P2 with the listeners and the CLIs.
 */
const NODE_SERVICE_KEYS: readonly string[] = [
  "build",
  "command",
  "depends_on",
  "env_file",
  "environment",
  "restart",
];

const HEALTHY = { condition: "service_healthy" };
/**
 * At P0 both wait on EMQX alone. The ported file has the simulator wait on a healthy gateway too,
 * so the gateway is subscribed before the hello; that depends on the gateway's healthcheck, which
 * arrives at P2 with its CLI, and `service_healthy` against a service with no healthcheck never
 * settles.
 */
const NODE_SERVICE_DEPENDS_ON: Record<NodeService, unknown> = {
  gateway: { emqx: HEALTHY },
  simulator: { emqx: HEALTHY },
};

type ComposeService = Record<string, unknown>;

interface ComposeFile {
  [key: string]: unknown;
  services: Record<string, ComposeService>;
}

const rawCompose = readFileSync(COMPOSE_PATH, "utf8");
const compose = parse(rawCompose) as ComposeFile;

function service(name: string): ComposeService {
  const svc = compose.services[name];
  if (svc === undefined) throw new Error(`service "${name}" is missing from docker-compose.yml`);
  return svc;
}

function nvmrcMajor(): number {
  const text = readFileSync(join(ROOT, ".nvmrc"), "utf8").trim();
  const match = /^v?(\d+)/.exec(text);
  if (match?.[1] === undefined) throw new Error(`.nvmrc has no leading integer: "${text}"`);
  return Number(match[1]);
}

function fromLines(dockerfilePath: string): string[] {
  return readFileSync(dockerfilePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^FROM\s/i.test(line));
}

describe("docker-compose.yml (static)", () => {
  it("defines exactly the emqx, gateway and simulator services", () => {
    expect(Object.keys(compose.services).sort()).toEqual(EXPECTED_SERVICES);
  });

  it("has no top-level version key", () => {
    expect(Object.keys(compose)).not.toContain("version");
  });

  it("pins EMQX to an exact major.minor.patch tag, and to 5.8.9", () => {
    // 5.9.0 and later are BSL 1.1, which is not an open-source licence for a product we sell.
    expect(service("emqx").image).toMatch(/^emqx\/emqx:\d+\.\d+\.\d+$/);
    expect(service("emqx").image).toBe("emqx/emqx:5.8.9");
  });

  it("publishes exactly the five EMQX ports, device-facing ones behind the bind host", () => {
    const ports = service("emqx").ports;
    expect(Array.isArray(ports)).toBe(true);
    const expected = EMQX_PORTS.map((p) =>
      p === 1883 || p === 8883 ? `${BIND_REFERENCE}:${p}:${p}` : `127.0.0.1:${p}:${p}`,
    );
    expect([...(ports as unknown[])].map(String).sort()).toEqual([...expected].sort());
  });

  it("publishes every port on host 127.0.0.1, never on 0.0.0.0 or without a host IP", () => {
    for (const [name, svc] of Object.entries(compose.services)) {
      if (svc.ports === undefined) continue;
      expect(Array.isArray(svc.ports), `service ${name} ports`).toBe(true);
      for (const entry of svc.ports as unknown[]) {
        const text = typeof entry === "string" ? entry : JSON.stringify(entry);
        const loopback = text.startsWith("127.0.0.1:");
        const behindBind = text.startsWith(`${BIND_REFERENCE}:`);
        expect(loopback || behindBind, `service ${name} port "${text}"`).toBe(true);
        expect(text.replace(BIND_REFERENCE, ""), `service ${name} port "${text}"`).not.toContain(
          "0.0.0.0",
        );
      }
    }
  });

  it("has an environment block on all three services", () => {
    // EMQX has one because anonymous access is off: the authenticator is configured entirely
    // through EMQX_AUTHENTICATION__1__* env vars. Three blocks, so no fourth can slip in.
    expect(service("emqx"), "service emqx").toHaveProperty("environment");
    expect(rawCompose.match(/^\s*environment\s*:/gm) ?? []).toHaveLength(3);
  });

  it("carries a comment saying the default dashboard credentials are for local development only", () => {
    const comments = rawCompose
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("#"));
    const found = comments.some(
      (line) => /credentials/i.test(line) && /local development only/i.test(line),
    );
    expect(found).toBe(true);
  });

  it("warns that the EMQX bootstrap file must be BOM-free, which it fails closed without", () => {
    expect(rawCompose).toMatch(/BOM/);
  });

  describe.each(NODE_SERVICES)("%s service", (name) => {
    it("builds from the repo root with its own Dockerfile", () => {
      expect(service(name).build).toEqual({
        context: ".",
        dockerfile: `services/${name}/Dockerfile`,
      });
    });

    it("loads ./.env as an optional env_file", () => {
      expect(service(name).env_file).toEqual([{ path: "./.env", required: false }]);
    });

    it('uses restart "no"', () => {
      expect(service(name).restart).toBe("no");
    });

    it("publishes no port at P0: nothing listens before the contract lands", () => {
      expect(service(name)).not.toHaveProperty("ports");
    });

    it("declares no healthcheck at P0: both service CLIs arrive with the contract", () => {
      expect(service(name)).not.toHaveProperty("healthcheck");
    });

    it("runs the image's default command plus its own listen argument", () => {
      expect(service(name).command).toEqual(NODE_SERVICE_COMMAND[name]);
    });

    it("passes no argument for a surface that does not exist yet", () => {
      const command = service(name).command as readonly string[];
      for (const flag of ["--operator-transcripts", "--content-admin", "--device-control"]) {
        expect(command, `${name} command`).not.toContain(flag);
      }
    });

    it("uses no Compose secrets", () => {
      expect(service(name)).not.toHaveProperty("secrets");
    });

    it("carries exactly these six keys and no other", () => {
      expect(Object.keys(service(name)).sort()).toEqual(NODE_SERVICE_KEYS);
    });

    it("carries exactly its own eight G3 keys as local defaults, in order", () => {
      const env = service(name).environment;
      expect(env).toEqual(expectedEnvironment(name));
      expect(Object.keys(env as Record<string, string>)).toEqual(
        NODE_SERVICE_ENV[name].map((e) => e[0]),
      );
    });

    it("writes every value as a reference to its own key, so no literal is pasted in", () => {
      const env = service(name).environment as Record<string, string>;
      for (const [key, value] of Object.entries(env)) {
        expect(value, `${name}.environment.${key}`).toMatch(
          new RegExp(`^\\$\\{${key}(?::-[^}]*)?\\}$`),
        );
      }
    });

    it("supplies a broker credential only where the principal is the cloud", () => {
      const env = service(name).environment as Record<string, string>;
      const expectedEnv = expectedEnvironment(name);
      for (const key of ["MQTT_USERNAME", "MQTT_PASSWORD"]) {
        expect(env[key], `${name}.environment.${key}`).toBe(expectedEnv[key]);
      }
      const bare = env["MQTT_USERNAME"] === "${MQTT_USERNAME}";
      expect(bare, `${name} broker credential`).toBe(name === "simulator");
    });

    it("defaults the device id to this product's prefix, never the sibling's", () => {
      const env = service(name).environment as Record<string, string>;
      expect(env["DEVICE_ID"]).toBe("${DEVICE_ID:-" + DEVICE_ID_DEFAULT + "}");
      expect(DEVICE_ID_DEFAULT.startsWith("prt_")).toBe(true);
    });

    it("defaults the device token to an unmistakable dev placeholder", () => {
      const env = service(name).environment as Record<string, string>;
      expect(env["DEVICE_TOKEN"]).toBe("${DEVICE_TOKEN:-" + DEVICE_TOKEN_DEFAULT + "}");
      expect(DEVICE_TOKEN_DEFAULT).toMatch(/dev/);
      expect(DEVICE_TOKEN_DEFAULT).toMatch(/not_a_secret/);
    });

    it("waits for the services it needs to be healthy", () => {
      expect(service(name).depends_on).toEqual(NODE_SERVICE_DEPENDS_ON[name]);
    });

    it("uses a Node base image whose major matches .nvmrc", () => {
      const lines = fromLines(join(ROOT, "services", name, "Dockerfile"));
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        const match = /^FROM\s+node:(\d+)[.\-\w]*/i.exec(line);
        expect(match, `FROM line "${line}"`).not.toBeNull();
        expect(Number(match?.[1])).toBe(nvmrcMajor());
      }
    });
  });
});

describe(".env.local.example (static)", () => {
  const rawLocalEnv = readFileSync(LOCAL_ENV_PATH, "utf8");
  const entries = parseEnvFile(rawLocalEnv);
  const values = new Map(entries);

  it("is marked dev-only, and says the one guarded panel is .env.example", () => {
    const comments = rawLocalEnv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("#"));
    expect(comments.some((line) => /dev-only/i.test(line))).toBe(true);
    expect(comments.some((line) => line.includes(".env.example"))).toBe(true);
  });

  it("assigns exactly the ten Local_Mode keys, once each", () => {
    expect(entries.map(([key]) => key).sort()).toEqual([...expectedLocalEnv().keys()].sort());
    expect(values.size).toBe(entries.length);
  });

  it("carries the same value for every key as the Compose default", () => {
    for (const [key, expectedValue] of expectedLocalEnv()) {
      expect(values.get(key), `.env.local.example ${key}`).toBe(expectedValue);
    }
  });

  it("supplies no broker credential: both MQTT credential keys are empty", () => {
    for (const key of ["MQTT_USERNAME", "MQTT_PASSWORD"]) {
      expect(values.get(key), `.env.local.example ${key}`).toBe("");
    }
  });

  it("holds an unmistakable dev placeholder, not a real token", () => {
    expect(values.get("DEVICE_TOKEN")).toBe(DEVICE_TOKEN_DEFAULT);
    expect(DEVICE_TOKEN_DEFAULT).toMatch(/dev/);
    expect(DEVICE_TOKEN_DEFAULT).toMatch(/not_a_secret/);
  });

  it("does not claim anonymous broker access, which the stack turns off", () => {
    // The ported file said the broker accepts anonymous connections locally. This one does not:
    // a reader who believes that comment debugs the wrong thing for an afternoon.
    expect(rawLocalEnv.toLowerCase()).not.toMatch(/accepts anonymous/);
  });
});
