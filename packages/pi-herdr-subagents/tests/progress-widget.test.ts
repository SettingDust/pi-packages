import { describe, expect, test } from "bun:test";
import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { createSubagentStatusWidget, type SubagentTaskObservation } from "../src/index.js";

const now = Date.parse("2026-01-01T00:01:05.000Z");
const tui = { requestRender() {} };
const plainTheme = { fg(_color: string, text: string) { return text; } };

function task(overrides: Partial<SubagentTaskObservation> & Pick<SubagentTaskObservation, "subagentId" | "status">): SubagentTaskObservation {
  return {
    generation: 1,
    agent: "handler",
    label: overrides.subagentId,
    queuedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("Dust-inspired progress status Component", () => {
  test("renders deterministic queued/running progress, sanitizes identity, and excludes terminal rows", () => {
    const component = createSubagentStatusWidget([
      task({ subagentId: "queued", status: "queued", label: "\u001b[31mqueue\nitem\u001b[0m", agent: "handler" }),
      task({ subagentId: "later", status: "running", label: "later", startedAt: "2026-01-01T00:01:00.000Z" }),
      task({ subagentId: "first", status: "running", label: "构建😀", agent: "构建😀", startedAt: "2026-01-01T00:00:05.000Z" }),
      task({ subagentId: "done", status: "completed", label: "private result must not render" }),
    ], { mode: "progress", useNerdFont: false, clock: () => now, tui, theme: plainTheme });

    expect(component.render(120)).toEqual([
      "> 构建😀  01:00  running",
      "> later · handler  00:05  running",
      "~ queue item · handler  01:05  queued",
    ]);
    expect(component.render(1).every(line => visibleWidth(line) <= 1)).toBeTrue();
    expect(component.render(120).join("\n")).not.toContain("private result");
    const combining = createSubagentStatusWidget([
      task({ subagentId: "combining", status: "running", label: "Ame\u0301lie", startedAt: "2026-01-01T00:00:05.000Z" }),
    ], { mode: "progress", useNerdFont: false, clock: () => now, tui, theme: plainTheme });
    expect(stripTerminalSequences(combining.render(15)[0]!)).toBe("> running Am...");
    expect(stripTerminalSequences(combining.render(16)[0]!)).toBe("> running Ame\u0301...");
    combining.dispose();
    component.dispose();
  });

  test("clamps invalid and future timestamps and caps progress at six rows plus overflow", () => {
    const tasks = Array.from({ length: 8 }, (_, index) => task({
      subagentId: `task-${index}`,
      status: "running",
      startedAt: index === 0 ? "invalid" : index === 1 ? "2027-01-01T00:00:00.000Z" : `2026-01-01T00:00:0${index}.000Z`,
    }));
    const component = createSubagentStatusWidget(tasks, { mode: "progress", useNerdFont: false, clock: () => now, tui, theme: plainTheme });
    const lines = component.render(80);
    expect(lines).toHaveLength(7);
    expect(lines.at(-1)).toBe("+2 more");

    const clamped = createSubagentStatusWidget(tasks.slice(0, 2), { mode: "progress", useNerdFont: false, clock: () => now, tui, theme: plainTheme });
    const six = createSubagentStatusWidget(tasks.slice(0, 6), { mode: "progress", useNerdFont: false, clock: () => now, tui });
    const seven = createSubagentStatusWidget(tasks.slice(0, 7), { mode: "progress", useNerdFont: false, clock: () => now, tui });
    expect(clamped.render(80).filter(line => line.includes("00:00"))).toHaveLength(2);
    expect(six.render(80)).toHaveLength(6);
    expect(seven.render(80).at(-1)).toBe("+1 more");
    component.dispose();
    clamped.dispose();
    six.dispose();
    seven.dispose();
  });

  test("renders exact Nerd Font and ASCII summary maps from the same snapshot", () => {
    const snapshot = [
      task({ subagentId: "run", status: "running", startedAt: "2026-01-01T00:00:00.000Z" }),
      task({ subagentId: "queue", status: "queued" }),
      task({ subagentId: "done", status: "completed" }),
      task({ subagentId: "fail", status: "failed" }),
      task({ subagentId: "cancel", status: "cancelled" }),
    ];
    const nerd = createSubagentStatusWidget(snapshot, { mode: "summary", useNerdFont: true, clock: () => now, tui, theme: plainTheme });
    const ascii = createSubagentStatusWidget(snapshot, { mode: "summary", useNerdFont: false, clock: () => now, tui, theme: plainTheme });
    expect(nerd.render(120)).toEqual([" 1 running   1 queued   1 completed   2 failed"]);
    expect(ascii.render(120)).toEqual(["> 1 running  ~ 1 queued  + 1 completed  ! 2 failed"]);
    expect(ascii.render(120)[0]).not.toMatch(/[]/);
    nerd.dispose();
    ascii.dispose();
  });

  test("owns one unref'd refresh timer and isolates requestRender failures", () => {
    const originalSetInterval = globalThis.setInterval;
    const originalClearInterval = globalThis.clearInterval;
    let callback: (() => void) | undefined;
    let intervals = 0;
    let unrefs = 0;
    let clears = 0;
    globalThis.setInterval = ((fn: () => void, ms: number) => {
      expect(ms).toBe(1000);
      intervals++;
      callback = fn;
      return { unref() { unrefs++; } } as any;
    }) as typeof setInterval;
    globalThis.clearInterval = ((_timer: unknown) => { clears++; }) as typeof clearInterval;
    try {
      const component = createSubagentStatusWidget([
        task({ subagentId: "run", status: "running", startedAt: "2026-01-01T00:00:00.000Z" }),
      ], {
        mode: "progress",
        useNerdFont: false,
        clock: () => now,
        tui: { requestRender() { throw new Error("render unavailable"); } },
      });
      expect({ intervals, unrefs }).toEqual({ intervals: 1, unrefs: 1 });
      expect(() => callback?.()).not.toThrow();
      component.dispose();
      component.dispose();
      expect(clears).toBe(1);

      createSubagentStatusWidget([], { mode: "progress", useNerdFont: false, clock: () => now, tui });
      createSubagentStatusWidget([task({ subagentId: "done", status: "completed" })], { mode: "summary", useNerdFont: false, clock: () => now, tui });
      expect(intervals).toBe(1);
    } finally {
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
    }
  });

  test("isolates theme and render input failures", () => {
    const component = createSubagentStatusWidget([
      task({ subagentId: "run", status: "running", startedAt: "2026-01-01T00:00:00.000Z" }),
    ], {
      mode: "progress",
      useNerdFont: false,
      clock: () => { throw new Error("clock failed"); },
      tui,
      theme: { fg() { throw new Error("theme failed"); } },
    });
    expect(() => component.render(Number.NaN)).not.toThrow();
    expect(component.render(80)).toEqual([]);
    component.dispose();
  });
});
