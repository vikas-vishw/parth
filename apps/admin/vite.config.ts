// product: the Parth Developer Console's build and dev server. ADAPTED from
// .reference/xelulu/apps/admin/vite.config.ts -- the operator proxy is dropped at P0 because the
// Operator_Surface it forwards to does not exist until P2. Internal only: dev and preview bind
// to loopback on a fixed port, and a busy port fails loudly rather than moving.
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const DEV_HOST = "127.0.0.1";
const DEFAULT_CONSOLE_PORT = 5173;

export default defineConfig(({ mode }) => {
  // The only environment access in this file: one non-secret local port.
  const env = loadEnv(mode, new URL("../..", import.meta.url).pathname, "CONSOLE_PORT");
  const raw = env["CONSOLE_PORT"];
  const parsed = raw === undefined || raw === "" ? NaN : Number(raw);
  const port =
    Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : DEFAULT_CONSOLE_PORT;

  return {
    plugins: [react()],
    server: { host: DEV_HOST, port, strictPort: true, cors: false },
    preview: { host: DEV_HOST, port: 4173, strictPort: true },
  };
});
