// @vitest-environment jsdom
// product: the console renders its placeholder and names itself.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { App, CONSOLE_TITLE } from "../src/app.js";

describe("console placeholder", () => {
  // Auto-cleanup only runs with Vitest globals, which this workspace does not enable.
  afterEach(cleanup);

  it("renders its title as a heading", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(CONSOLE_TITLE);
  });

  it("says it is internal only", () => {
    render(<App />);
    expect(screen.getByText(/internal only/i).textContent).toMatch(/internal only/i);
  });
});
