// platform: the P0 config parser accepts a Local_Mode environment and reports key names only.
import { describe, expect, it } from "vitest";

import { parseGatewayConfig } from "../src/config.js";

const LOCAL = Object.freeze({
  APP_ENV: "local",
  MQTT_BROKER_URL: "mqtt://127.0.0.1:1883",
  MQTT_USERNAME: "",
  MQTT_PASSWORD: "",
  AUDIO_WSS_URL: "ws://127.0.0.1:8081",
  DEVICE_ID: "dev_local_only",
  DEVICE_TOKEN: "dev_local_only_not_a_secret",
  GATEWAY_OPERATOR_PORT: "8090",
});

describe("gateway config", () => {
  it("accepts a Local_Mode environment and maps empty credentials to null", () => {
    const result = parseGatewayConfig(LOCAL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.localMode).toBe(true);
    expect(result.config.broker.username).toBeNull();
    expect(result.config.broker.password).toBeNull();
  });

  it("reports the offending key names and no values", () => {
    const result = parseGatewayConfig({
      ...LOCAL,
      GATEWAY_OPERATOR_PORT: "not-a-port",
      DEVICE_ID: "a/b",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.offendingKeys).toContain("GATEWAY_OPERATOR_PORT");
    expect(result.offendingKeys).toContain("DEVICE_ID");
    for (const key of result.offendingKeys) {
      expect(key).not.toContain("not-a-port");
      expect(key).not.toContain("a/b");
    }
  });

  it("refuses an empty environment rather than inventing defaults", () => {
    // The Local_Mode defaults live in docker-compose.yml, not in the service. A bare process
    // with no environment is a configuration error, and that is deliberate.
    const result = parseGatewayConfig({});
    expect(result.ok).toBe(false);
  });

  it("refuses a plaintext broker outside Local_Mode", () => {
    const result = parseGatewayConfig({
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
