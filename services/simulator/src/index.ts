// platform: the simulator's composition root. NEW, and P0-only; replaced at P2 by the ported
// entry point. Installs the crash handler first, reads the config, and either reports the
// offending key names and exits non-zero, or starts the lifecycle and idles.
import { installProcessHandlers } from "./crash.js";
import { systemClock } from "./clock.js";
import { writeConfigError } from "./config-error-writer.js";
import { readSimulatorConfig } from "./env.js";
import { hasListenAllArgument, localSurfaceHost } from "./listen-host.js";
import { flushStdout, stdoutSink } from "./log/logger.js";
import { startLifecycle, type Lifecycle, type StopSignal } from "./lifecycle.js";

/** Exit code the reference reserves for a refused config. */
const CONFIG_ERROR_EXIT = 2;

let lifecycle: Lifecycle | null = null;
let lastSignal: StopSignal = "SIGTERM";

// Registered before the crash handler so the signal name is known by the time the stop path
// runs: Node calls signal listeners in registration order.
const remember = (signal: StopSignal) => () => {
  lastSignal = signal;
};
process.on("SIGTERM", remember("SIGTERM"));
process.on("SIGINT", remember("SIGINT"));

installProcessHandlers(
  process,
  () => {
    // A fatal error carries no error text, and no partial stop line is written.
    lifecycle = null;
  },
  () =>
    new Promise<void>((resolve) => {
      lifecycle?.stop(lastSignal);
      // Let the stop line leave the process before the handler exits with 0.
      flushStdout(resolve);
    }),
  flushStdout,
);

const result = readSimulatorConfig();
if (!result.ok) {
  writeConfigError(result.offendingKeys);
  process.exitCode = CONFIG_ERROR_EXIT;
} else {
  const { localMode } = result.config;
  lifecycle = startLifecycle({
    service: "simulator",
    appEnv: localMode ? "local" : "non-local",
    listenHost: localSurfaceHost(localMode, hasListenAllArgument(process.argv)),
    pid: process.pid,
    sink: stdoutSink,
    clock: systemClock,
  });
}
