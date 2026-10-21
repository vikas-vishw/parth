// platform: the P0 config parser accepts a Local_Mode environment and reports key names only.
import { describe, expect, it } from "vitest";

import { parseSimulatorConfig } from "../src/config.js";

const LOCAL = Object.freeze({
  APP_ENV: "local",
  MQTT_BROKER_URL: "mqtt://127.0.0.1:1883",
  MQTT_USERNAME: "",
  MQTT_PASSWORD: "",
  AUDIO_WSS_URL: "ws://127.0.0.1:8081",
  DEVICE_ID: "dev_local_only",
  DEVICE_TOKEN: "dev_local_only_not_a_secret",
  SIMULATOR_PANEL_PORT: "8090",
});

describe("simulator config", () => {
  it("accepts a Local_Mode environment and maps empty credentials to null", () => {
    const result = parseSimulatorConfig(LOCAL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.localMode).toBe(true);
    expect(result.config.broker.username).toBeNull();
    expect(result.config.broker.password).toBeNull();
  });

  it("reports the offending key names and no values", () => {
    const result = parseSimulatorConfig({
      ...LOCAL,
      SIMULATOR_PANEL_PORT: "not-a-port",
      DEVICE_ID: "a/b",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.offendingKeys).toContain("SIMULATOR_PANEL_PORT");
    expect(result.offendingKeys).toContain("DEVICE_ID");
    for (const key of result.offendingKeys) {
      expect(key).not.toContain("not-a-port");
      expect(key).not.toContain("a/b");
    }
  });

  it("refuses an empty environment rather than inventing defaults", () => {
    // The Local_Mode defaults live in docker-compose.yml, not in the service. A bare process
    // with no environment is a configuration error, and that is deliberate.
    const result = parseSimulatorConfig({});
    expect(result.ok).toBe(false);
  });

  it("refuses a plaintext broker outside Local_Mode", () => {
    const result = parseSimulatorConfig({
      ...LOCAL,
      APP_ENV: "production",
      MQTT_USERNAME: "u",
      MQTT_PASSWORD: "p",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.offendingKeys).toContain("MQTT_BROKER_URL");
  });
});
