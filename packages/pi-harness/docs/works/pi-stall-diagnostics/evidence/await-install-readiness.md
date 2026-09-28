# T4 five-target installation/recovery: offline acceptance passed

T4 is complete offline for `offline-7-awaits` under Windows/Bun 1.4.0. [Hash-bound evidence](await-install-offline.json) records **161 passing checks**, the reproduced five-target manifest, current installer/command/check hashes and reused T3 hashes. No expanded live preparation, installation or rollback was executed. All prepared manifests retain `activationAllowed: false`.

```sh
bun packages/pi-harness/tools/pi-stall-diagnostics/check-await-install.mjs 'D:/Applications/Scoop/apps/pi-coding-agent-bun/0.87.1/node_modules/@earendil-works/pi-coding-agent' packages/pi-harness/docs/works/pi-stall-diagnostics/evidence/await-install-offline.json
```

## Delivered behavior

`install.mjs` adds explicit expanded admission and uses the existing Windows ownership, flushed same-directory replacement and hash-driven recovery engine. Each target has separate pristine, pre-upgrade baseline and new hashes, plus verified material for each. Equal hashes participate in every matching set: unchanged Google is both baseline/new; the three previously uninstrumented files are both pristine/baseline. The accepted T3 evidence supplies hashes/selectors; edited manifests cannot select another target or revision.

Installation changes four files and skips Google. Repeated installation and restoration do not rewrite matching targets. Expanded default rollback restores the entire **offline-6 diagnostic baseline**, preserving the previously installed main/Google probes. Explicit `pristine` restoration removes both revisions' diagnostics. A known mixed set is restored to baseline before a separate installation attempt; neither journal claims nor truncated progress determine state. Unknown bytes or invalid recovery material stop mutation and expose five residual hashes. A fault before the first replacement preserves the initial consistent set; after a replacement, guarded recovery restores baseline when safe.

`activate.mjs` exposes `status-awaits`, `prepare-awaits`, `install-awaits`, `rollback-awaits` and `pristine-awaits`. Preparation requires a new empty recovery directory and reconstructs guarded originals only in a disposable tree before rebinding independently reproduced material. The existing recovery directory is never reused. Live expanded operations require the completed hash-matching acceptance evidence, fresh source/material guards and Bun compatibility; they have no fixture overrides or blanket inactivity gate. These live paths were implemented but **not executed** by T4. Supported later commands are in the [kit README](../../../../tools/pi-stall-diagnostics/README.md).

## Focused verification

The acceptance runner persists each result incrementally and verifies source preservation in its finalizer:

- Hash-matching T3 kit evidence reused; original main/Google obtained from verified existing backups in disposable trees, installed main reproduced exactly, and all five new output hashes/selectors reproduced. Diagnostic transformations, logger and T3 fixtures remain unchanged; their broad semantic/cost suites were not rerun.
- Baseline-to-new installation, repeat no-rewrite, baseline rollback/repeat and explicit pristine restoration/repeat passed. Pair-only admission still rejects expanded manifests. A focused offline-6 install/repeat/rollback/repeat regression passed through the shared engine.
- Thrown faults and voluntary worker exits before/after every changed install/rollback replacement passed. Restart after truncated journals, interrupted mixed recovery before/after each changed target, all 14 nonconsistent baseline/new combinations with stale-success journals, separate subsequent installation and smoke-failure recovery passed.
- All-five unknown-target preservation; missing/corrupt original/baseline/stage material; duplicate/escaping paths; selector/manifest/mapping/read-only drift; linked target/material refusal; between-write target/material/selector/mapping/read-only/journal-link drift; concurrent ownership refusal; and Windows open-reader refusal passed. Unsafe recovery reports all five residual states without overwriting the unknown material.
- Import/export contracts match for all five files. **All 16 baseline/new combinations** of main, OpenAI adapter, OpenAI SDK and forwarder passed under Bun with unchanged Google, in both enabled and disabled modes. Fixtures import actual main/adapter/SDK/forwarder modules, replace disposable main bytes after import, verify Bun retains its cached module even with an import query, and exercise lazy forwarding with fake OpenAI success/cancellation. Callback receiver/model and inner/outer result identity, expected event order and cancellation settlement passed. Old-main/new-publisher and new-main/old-publisher combinations tolerate absent bridge coverage.
- Consistent baseline/new/pristine sets passed isolated CLI/Google smoke and enabled/disabled OpenAI fake-transport/forwarding smoke. Children have empty isolated homes, no inherited credentials, and network/process-creation blockers; no session state was created. Mixed sets were loaded only in compatibility fixtures.

The final evidence binds `install.mjs`, `activate.mjs`, `check-await-install.mjs` and `check-await-mixed.mjs` to their current hashes. Node syntax checks passed for the command and both new checks; Bun parsed/executed the installer during acceptance. Tracked `git diff --check` passed; this Work and kit were already untracked at entry.

## Preservation and limits

Final seven-file installed hashes, canonical `current` mapping, entry/runtime hashes and **all existing recovery-directory file contents** match the starting snapshots. No activation, provider request, debugger attachment, inspector/environment change, session operation or existing-process termination was performed. Unrelated repository work was preserved.

PID **265264 was already unavailable** to read-only process inspection before the final acceptance run and remained unavailable afterward. A separate read-only `Get-Process` returned `NoProcessFoundForGivenId`. T4 did not terminate it; continued existence or preservation of that process cannot be claimed. The captured incident remains historical evidence, and no new runtime observations diagnose its pending await.

Replacement remains serialized, not atomic across five files. Voluntary worker exits establish restart recovery, not power-loss durability. Mixed cached revisions can provide partial diagnostics; they are not a promise that existing processes gain the new probes. The compatibility fixture uses actual modules and controlled fake transport, not real-provider validation.

Later activation remains separately selected and requires fresh canonical version/runtime/import/source/selector and five-target material/hash guards, a new recovery directory preserving both pristine and baseline copies, the verified Bun runtime and unchanged acceptance hashes, safe replacement and fresh consistent-set isolated provider-free smoke. No live rollback drill, blanket all-runtime inactivity requirement or renewed approval for offline preparation was introduced.
