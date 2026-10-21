// platform: the shared package exports nothing at P0 (Req 9.2, 9.3).
import { describe, expect, it } from "vitest";

import * as ns from "../dist/index.js";

describe("shared package exports", () => {
  it("has no own enumerable keys", () => {
    expect(Object.keys(ns)).toHaveLength(0);
  });

  it("has no default export", () => {
    expect("default" in ns).toBe(false);
  });
});
