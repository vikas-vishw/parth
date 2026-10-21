// platform: the bind host of the service's local surface. ADAPTED from
// .reference/xelulu/services/gateway/src/listen-host.ts -- the transcripts, content-admin and
// device-control arguments are dropped at P0 because the surfaces they gate do not exist until
// P2 and later. The simulator keeps a copy of this file, because services never import each other.

/** The argument Compose adds to bind the local surface on every container interface. */
export const LISTEN_ALL_ARGUMENT = "--listen-all-interfaces";

export function hasListenAllArgument(argv: readonly string[]): boolean {
  return argv.includes(LISTEN_ALL_ARGUMENT);
}

/** 0.0.0.0 only with Local_Mode and the argument; 127.0.0.1 in every other case. */
export function localSurfaceHost(localMode: boolean, listenAll: boolean): "127.0.0.1" | "0.0.0.0" {
  return localMode && listenAll ? "0.0.0.0" : "127.0.0.1";
}
