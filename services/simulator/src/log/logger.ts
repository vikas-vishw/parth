// platform: the only module that writes to stdout: one JSON line per entry. ADAPTED from
// .reference/xelulu/services/simulator/src/log/logger.ts -- the reference's version imports the
// shared package for its log-entry types, and the contract those types describe does not exist
// until P1. This is reduced to the same no-import shape as the gateway's logger, emitting the
// identical line format, and P1 restores the typed entries.

export interface LineSink {
  writeLine(json: string): void;
}

export const stdoutSink: LineSink = {
  writeLine(json) {
    process.stdout.write(json + "\n");
  },
};

/**
 * Calls `done` once every line written so far has left the process: an empty write is queued
 * behind them, and its callback runs after they are flushed. Used before a fatal exit.
 */
export function flushStdout(done: () => void): void {
  process.stdout.write("", () => done());
}
