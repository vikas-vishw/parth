// platform: a LineSink that keeps every line, for asserting on exact output.
import type { LineSink } from "../../src/log/logger.js";

export type CaptureSink = LineSink & { readonly lines: string[] };

export function createCaptureSink(): CaptureSink {
  const lines: string[] = [];
  return { lines, writeLine: (json) => void lines.push(json) };
}
