import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext, Skill } from "@earendil-works/pi-coding-agent";
import activateHarness, { admitPlanned, admitPlannedTransaction } from "../extensions/pi-harness.js";
import { buildPlannedSubject, ReceiptRegistry, validateTuple, type PlannedSubject } from "../src/admission.js";
import type { ModelRole } from "../src/index.js";
type TestTool = { execute(...args: any[]): Promise<any> };
const role: ModelRole = { name: "standard", description: "Test role", model: "test/model", thinking: "medium", available: true };
const skill = { name: "implement", description: "Implement bounded work", filePath: "/skill", baseDir: "/", sourceInfo: { source: "test", scope: "project", path: "/skill" }, disableModelInvocation: false } as unknown as Skill;

test("private registry distinguishes current acceptance, session reset, and corrupt lineage", async () => {
  const subject = await fixtureSubject();
  const registry = new ReceiptRegistry("session-a");
  expect(registry.lookup(subject)).toEqual({ kind: "none" });
  const review = registry.recordReview(subject);
  expect(registry.lookup(subject)).toMatchObject({ kind: "review" });
  registry.recordAcceptance(subject, review, "explicit");
  expect(registry.lookup(subject)).toMatchObject({ kind: "accepted" });
  registry.bind("session-b");
  expect(registry.lookup(subject)).toEqual({ kind: "none" });

  registry.bind("session-a");
  const reviewAgain = registry.recordReview(subject);
  registry.recordAcceptance(subject, reviewAgain, "explicit");
  const state = registry as unknown as { heads: Map<string, string> };
  state.heads.delete(subject.authorityPathTuple);
  expect(registry.prior(subject)).toMatchObject({ kind: "corrupt" });
});

test("Extension enforces D2/D3, reuse, bounded amendment, drift, and shutdown reset", async () => {
  const cwd = await mkdtemp(join(process.cwd(), "pi-harness-admission-"));
  try {
    const directory = join(cwd, "docs", "works", "demo");
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "work.md"), "work\n", "utf8");
    await writeFile(join(directory, "plan-slice.md"), "plan-a\n", "utf8");
    await writeFile(join(directory, "tasks-slice.md"), "tasks\n", "utf8");

    const handlers = new Map<string, (event: unknown, ctx: ExtensionContext) => unknown>();
    let tool: TestTool | undefined;
    const pi = {
      on(name: string, handler: (event: unknown, ctx: ExtensionContext) => unknown) { handlers.set(name, handler); },
      registerCommand() {},
      registerTool(value: TestTool) { tool = value; },
      getActiveTools: () => [],
      setActiveTools() {},
    } as unknown as ExtensionAPI;
    activateHarness(pi, () => ({ status: "ready", roles: [role] }), async () => {});
    const event = {
      type: "before_agent_start",
      prompt: "",
      systemPrompt: "",
      systemPromptOptions: { cwd, skills: [skill] },
    } as any;
    const answers: Array<boolean | "drift"> = [true, true];
    const calls: string[] = [];
    const ctx = {
      cwd,
      mode: "tui",
      hasUI: true,
      ui: {
        confirm: async (title: string) => {
          calls.push(title);
          const answer = answers.shift() ?? true;
          if (answer === "drift") await writeFile(join(directory, "plan-slice.md"), "drifted\n", "utf8");
          return answer === true || answer === "drift";
        },
      },
      sessionManager: { getSessionId: () => "session-a" },
      isProjectTrusted: () => false,
      modelRegistry: { getAvailable: () => [] },
    } as unknown as ExtensionContext;
    await (handlers.get("before_agent_start")!)(event, ctx);
    expect(tool).toBeDefined();

    const params = {
      handoff: {
        objective: "Implement the bounded admission change.",
        primarySkill: "implement",
        companionSkills: [],
        context: [
          { ref: "docs/works/demo/work.md", purpose: "Work authority." },
          { ref: "docs/works/demo/plan-slice.md", purpose: "Plan authority." },
          { ref: "docs/works/demo/tasks-slice.md", purpose: "Tasks authority." },
        ],
      },
      admission: { path: "planned", authority: { work: "docs/works/demo/work.md", plan: "docs/works/demo/plan-slice.md", tasks: "docs/works/demo/tasks-slice.md" } },
      modelRole: "standard",
    };
    const execute = () => tool!.execute("call", params as any, undefined, undefined, ctx);
    expect((await execute()).details).toMatchObject({ status: "resolved" });
    expect(calls).toEqual(["Review planned delegation", "Accept planned delegation"]);
    expect((await execute()).details).toMatchObject({ status: "resolved" });
    expect(calls).toHaveLength(2);

    await writeFile(join(directory, "plan-slice.md"), "plan-b\n", "utf8");
    answers.push(false);
    expect((await execute()).details).toMatchObject({ status: "blocked", code: "amendment_invalidated" });
    answers.push(true, true, true);
    expect((await execute()).details).toMatchObject({ status: "resolved" });
    expect(calls.slice(2)).toEqual(["Authorize bounded amendment", "Authorize bounded amendment", "Review planned delegation", "Accept planned delegation"]);

    const noUi = { ...ctx, mode: "print", hasUI: false } as unknown as ExtensionContext;
    expect((await tool!.execute("call", params as any, undefined, undefined, noUi)).details).toMatchObject({ status: "resolved" });
    await (handlers.get("session_shutdown")!({ type: "session_shutdown" }, ctx));
    expect((await tool!.execute("call", params as any, undefined, undefined, noUi)).details).toMatchObject({ status: "blocked", code: "review_required" });

    const driftAnswers: Array<boolean | "drift"> = ["drift"];
    const driftCtx = { ...ctx, ui: { confirm: async (title: string) => { driftAnswers.shift(); calls.push(title); await writeFile(join(directory, "plan-slice.md"), "drifted-again\n", "utf8"); return true; } } } as unknown as ExtensionContext;
    expect((await executeWith(tool, params, driftCtx)).details).toMatchObject({ status: "blocked", code: "authority_drift" });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

async function executeWith(tool: TestTool | undefined, params: unknown, actual: ExtensionContext) {
  return tool!.execute("call", params as any, undefined, undefined, actual);
}

async function fixtureSubject(workName = "demo"): Promise<PlannedSubject> {
  const cwd = await mkdtemp(join(process.cwd(), "pi-harness-registry-"));
  const directory = join(cwd, "docs", "works", workName);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "work.md"), "work\n", "utf8");
  await writeFile(join(directory, "plan-slice.md"), "plan\n", "utf8");
  await writeFile(join(directory, "tasks-slice.md"), "tasks\n", "utf8");
  const subject = await buildPlannedSubject(cwd, {
    work: `docs/works/${workName}/work.md`,
    plan: `docs/works/${workName}/plan-slice.md`,
    tasks: `docs/works/${workName}/tasks-slice.md`,
  }, {
    objective: "test",
    primarySkill: "implement",
    companionSkills: [],
    context: [
      { ref: `docs/works/${workName}/work.md`, purpose: "work" },
      { ref: `docs/works/${workName}/plan-slice.md`, purpose: "plan" },
      { ref: `docs/works/${workName}/tasks-slice.md`, purpose: "tasks" },
    ],
    constraints: [],
    deliverables: [],
  });
  await rm(cwd, { recursive: true, force: true });
  return subject;
}


test("serializes same-tuple transactions while allowing different tuples and reset", async () => {
  const registry = new ReceiptRegistry("session-a");
  const events: string[] = [];
  let releaseFirst!: () => void;
  const first = registry.runExclusive("same", async (isCurrent) => {
    events.push("first-start");
    await new Promise<void>((resolve) => { releaseFirst = resolve; });
    events.push(isCurrent() ? "first-current" : "first-stale");
    return "first";
  });
  await Bun.sleep(0);
  const second = registry.runExclusive("same", async () => {
    events.push("second");
    return "second";
  });
  const other = registry.runExclusive("other", async () => {
    events.push("other");
    return "other";
  });
  await other;
  expect(events).toEqual(["first-start", "other"]);
  releaseFirst();
  expect(await first).toEqual({ completed: true, value: "first" });
  expect(await second).toEqual({ completed: true, value: "second" });
  expect(events).toEqual(["first-start", "other", "first-current", "second"]);

  let releaseStale!: () => void;
  const stale = registry.runExclusive("reset", async (isCurrent) => {
    await new Promise<void>((resolve) => { releaseStale = resolve; });
    return isCurrent() ? "current" : "stale";
  });
  await Bun.sleep(0);
  registry.clear();
  const fresh = registry.runExclusive("reset", async () => "fresh");
  expect(await fresh).toEqual({ completed: true, value: "fresh" });
  releaseStale();
  expect(await stale).toEqual({ completed: true, value: "stale" });
});


test("rejects forked and cyclic acceptance lineage", async () => {
  const subject = await fixtureSubject();
  const registry = new ReceiptRegistry("session-a");
  const firstReview = registry.recordReview(subject);
  registry.recordAcceptance(subject, firstReview, "explicit");

  const fork = { ...subject, subjectSha256: `${subject.subjectSha256}-fork` };
  const forkReview = registry.recordReview(fork);
  registry.recordAcceptance(fork, forkReview, "explicit");
  expect(registry.lookup(subject)).toMatchObject({ kind: "corrupt" });

  const cycleRegistry = new ReceiptRegistry("session-a");
  const review = cycleRegistry.recordReview(subject);
  const acceptance = cycleRegistry.recordAcceptance(subject, review, "explicit");
  (acceptance as { predecessor?: typeof acceptance }).predecessor = acceptance;
  expect(cycleRegistry.lookup(subject)).toMatchObject({ kind: "corrupt" });
});


test("requires direct Plan and Tasks members", () => {
  expect(() => validateTuple({
    work: "/workspace/docs/works/demo/work.md",
    plan: "/workspace/docs/works/demo/nested/plan-slice.md",
    tasks: "/workspace/docs/works/demo/nested/tasks-slice.md",
  })).toThrow("authority members must share one directory");
});

test("preserves a UTF-8 BOM in the fixed canonical document digest", async () => {
  const cwd = await mkdtemp(join(process.cwd(), "pi-harness-bom-"));
  const directory = join(cwd, "docs", "works", "demo");
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "work.md"), Uint8Array.from([0xef, 0xbb, 0xbf, 0x61, 0x0d, 0x0a, 0x62, 0x0d, 0x63]));
    await writeFile(join(directory, "plan-slice.md"), "plan\n", "utf8");
    await writeFile(join(directory, "tasks-slice.md"), "tasks\n", "utf8");
    const subject = await buildPlannedSubject(cwd, {
      work: "docs/works/demo/work.md",
      plan: "docs/works/demo/plan-slice.md",
      tasks: "docs/works/demo/tasks-slice.md",
    }, {
      objective: "test",
      primarySkill: "implement",
      companionSkills: [],
      context: [
        { ref: "docs/works/demo/work.md", purpose: "work" },
        { ref: "docs/works/demo/plan-slice.md", purpose: "plan" },
        { ref: "docs/works/demo/tasks-slice.md", purpose: "tasks" },
      ],
      constraints: [],
      deliverables: [],
    });
    expect(subject.work.sha256).toBe("1a436bdf3c8e6803688ebf5a0492d0957d0b4f16306074734f3a4f038f05a736");
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("rejects session reset after the final JIT await", async () => {
  const subject = await fixtureSubject();
  const registry = new ReceiptRegistry("session-a");
  let release!: () => void;
  let reachedFinal!: () => void;
  const finalReached = new Promise<void>((resolve) => { reachedFinal = resolve; });
  const finalBarrier = new Promise<void>((resolve) => { release = resolve; });
  let recomputes = 0;
  const recompute = async () => {
    recomputes++;
    if (recomputes === 3) {
      reachedFinal();
      await finalBarrier;
    }
    return subject;
  };
  const ctx = { mode: "tui", hasUI: true, ui: { confirm: async () => true } } as unknown as ExtensionContext;
  const admission = { path: "planned" as const, authority: { work: subject.work.path, plan: subject.plan.path, tasks: subject.tasks.path } };
  const transaction = registry.runExclusive(subject.authorityPathTuple, (isCurrent) => admitPlannedTransaction(subject, admission, recompute, ctx, registry, isCurrent));
  await finalReached;
  registry.bind("session-b");
  release();
  const result = await transaction;
  expect(result).toMatchObject({ completed: true, value: { status: "blocked", code: "acceptance_required" } });
});

test("fails closed for inconsistent linked reviews and unauthenticated predecessors", async () => {
  const subject = await fixtureSubject();
  const registry = new ReceiptRegistry("session-a");
  const review = registry.recordReview(subject);
  const acceptance = registry.recordAcceptance(subject, review, "explicit");
  acceptance.review = { ...acceptance.review, work: { ...acceptance.review.work, sha256: "corrupted" } };
  expect(registry.lookup(subject)).toMatchObject({ kind: "corrupt" });

  const predecessorRegistry = new ReceiptRegistry("session-a");
  const firstReview = predecessorRegistry.recordReview(subject);
  const first = predecessorRegistry.recordAcceptance(subject, firstReview, "explicit");
  const changed = await fixtureSubject("other");
  const changedReview = predecessorRegistry.recordReview(changed);
  predecessorRegistry.recordAcceptance(changed, changedReview, "explicit", { ...first });
  expect(predecessorRegistry.lookup(changed)).toMatchObject({ kind: "corrupt" });

  const crossTupleRegistry = new ReceiptRegistry("session-a");
  const crossReview = crossTupleRegistry.recordReview(changed);
  crossTupleRegistry.recordAcceptance(changed, crossReview, "explicit", first);
  expect(crossTupleRegistry.lookup(changed)).toMatchObject({ kind: "corrupt" });
});


test("refreshes a queued same-tuple subject before receipt lookup", async () => {
  const subject = await fixtureSubject();
  const changed = { ...subject, plan: { ...subject.plan, sha256: "changed" }, setSha256: "changed-set", subjectSha256: "changed-subject" };
  const registry = new ReceiptRegistry("session-a");
  const review = registry.recordReview(subject);
  registry.recordAcceptance(subject, review, "explicit");

  let releaseFirst!: () => void;
  let firstStarted!: () => void;
  const started = new Promise<void>((resolve) => { firstStarted = resolve; });
  const barrier = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const first = registry.runExclusive(subject.authorityPathTuple, async () => {
    firstStarted();
    await barrier;
  });
  await started;

  let current = subject;
  const admission = { path: "planned" as const, authority: { work: subject.work.path, plan: subject.plan.path, tasks: subject.tasks.path } };
  const ctx = { mode: "print", hasUI: false } as unknown as ExtensionContext;
  const queued = admitPlanned(subject, admission, async () => current, ctx, registry);
  current = changed;
  releaseFirst();

  await first;
  expect(await queued).toMatchObject({ status: "blocked", code: "review_required" });
});

test("maps rejected confirmation promises to admission blocks", async () => {
  const subject = await fixtureSubject();
  const admission = { path: "planned" as const, authority: { work: subject.work.path, plan: subject.plan.path, tasks: subject.tasks.path } };
  const recompute = async () => subject;
  const rejected = { mode: "tui", hasUI: true, ui: { confirm: async () => { throw new Error("ui closed"); } } } as unknown as ExtensionContext;
  const registry = new ReceiptRegistry("session-a");

  expect(await admitPlannedTransaction(subject, admission, recompute, rejected, registry, () => true)).toMatchObject({ status: "blocked", code: "review_required" });
  const review = registry.recordReview(subject);
  expect(await admitPlannedTransaction(subject, admission, recompute, rejected, registry, () => true)).toMatchObject({ status: "blocked", code: "acceptance_required" });

  registry.recordAcceptance(subject, review, "explicit");
  const changed = { ...subject, plan: { ...subject.plan, sha256: "changed" }, setSha256: "changed-set", subjectSha256: "changed-subject" };
  expect(await admitPlannedTransaction(changed, admission, async () => changed, rejected, registry, () => true)).toMatchObject({ status: "blocked", code: "amendment_invalidated" });
});

test("rechecks bounded amendments before opening D2", async () => {
  const subject = await fixtureSubject();
  const changed = { ...subject, plan: { ...subject.plan, sha256: "changed" }, setSha256: "changed-set", subjectSha256: "changed-subject" };
  const drifted = { ...changed, plan: { ...changed.plan, sha256: "drifted" }, setSha256: "drifted-set", subjectSha256: "drifted-subject" };
  const registry = new ReceiptRegistry("session-a");
  const review = registry.recordReview(subject);
  registry.recordAcceptance(subject, review, "explicit");
  let current = changed;
  const calls: string[] = [];
  const ctx = {
    mode: "tui",
    hasUI: true,
    ui: {
      confirm: async (title: string) => {
        calls.push(title);
        current = drifted;
        return true;
      },
    },
  } as unknown as ExtensionContext;
  const admission = { path: "planned" as const, authority: { work: subject.work.path, plan: subject.plan.path, tasks: subject.tasks.path } };

  expect(await admitPlannedTransaction(changed, admission, async () => current, ctx, registry, () => true)).toMatchObject({ status: "blocked", code: "authority_drift" });
  expect(calls).toEqual(["Authorize bounded amendment"]);
});


test("rejects session reset after bounded amendment before D2", async () => {
  const subject = await fixtureSubject();
  const changed = { ...subject, plan: { ...subject.plan, sha256: "changed" }, setSha256: "changed-set", subjectSha256: "changed-subject" };
  const registry = new ReceiptRegistry("session-a");
  const review = registry.recordReview(subject);
  registry.recordAcceptance(subject, review, "explicit");
  const calls: string[] = [];
  const ctx = {
    mode: "tui",
    hasUI: true,
    ui: {
      confirm: async (title: string) => {
        calls.push(title);
        registry.bind("session-b");
        return true;
      },
    },
  } as unknown as ExtensionContext;
  const admission = { path: "planned" as const, authority: { work: subject.work.path, plan: subject.plan.path, tasks: subject.tasks.path } };

  const result = await registry.runExclusive(changed.authorityPathTuple, (isCurrent) =>
    admitPlannedTransaction(changed, admission, async () => changed, ctx, registry, isCurrent),
  );
  expect(result).toMatchObject({ completed: true, value: { status: "blocked", code: "review_required" } });
  expect(calls).toEqual(["Authorize bounded amendment"]);
});
