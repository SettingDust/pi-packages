# Five-target activation refused at launcher guard (2026-09-25)

Explicit installation was selected, but no await probes were installed. `bun` is
1.4.0; the canonical Pi root reports 0.87.1. Before the attempt, `status-awaits`
showed the exact offline-6 baseline across all five targets; all seven installed
source hashes matched `awaits-offline.json:sourceHashes`, and the four current
installer/command/check hashes matched `await-install-offline.json:kitHashes`.

Created a new empty directory at
`C:/Users/WINDOWS/AppData/Local/pi-stall-recovery-0.87.1-awaits-20260925T1234Z`.
The supported command
`bun packages/pi-harness/tools/pi-stall-diagnostics/activate.mjs prepare-awaits C:/Users/WINDOWS/AppData/Local/pi-stall-recovery-0.87.1-awaits-20260925T1234Z`
exited 1 with `Pi launcher mapping drift` before staging or replacement. The
guard in `install.mjs:liveCompatibility` requires the launcher to run `bun
"%~dp0node_modules\@earendil-works\pi-coding-agent\dist\bundle\cli.js" %*`;
the real `D:/Applications/Scoop/apps/pi-coding-agent-bun/current/pi.cmd` runs
`bun --inspect "%~dp0node_modules\@earendil-works\pi-coding-agent\dist\bundle\cli.js" %*`.
This existing inspector launch setting is outside the authorized activation;
neither it nor the acceptance-bound guard was changed. No `install-awaits`,
consistent-set smoke, or rollback was run because no recovery manifest was
created. The new directory remains empty and is not a usable recovery backup.

[Post-refusal status](await-activation-blocked-status.json) confirms all five
installed hashes remain in the baseline set; no mixed state needs recovery.
The original `C:/Users/WINDOWS/AppData/Local/pi-stall-recovery-0.87.1` is
retained with its original main/Google backups and patched stages hash-matching
the established contract. No process was stopped or restarted. PID 274940 was
not returned by a read-only process query during this attempt; its continued
existence was not established. Logging remains configured in the Windows user
environment at `C:/Users/WINDOWS/AppData/Local/pi-stall-logs`. Existing shells
may require `$env:PI_STALL_LOG_DIR = 'C:/Users/WINDOWS/AppData/Local/pi-stall-logs'`
before a future normal launch. Existing loaded modules are not retroactively
instrumented, and no new-process await-probe evidence was generated.

The exact expanded rollback command, **only after a successful guarded prepare
and install using a populated manifest at this same directory**, would be:

```powershell
bun 'E:/Projects/pi-packages/packages/pi-harness/tools/pi-stall-diagnostics/activate.mjs' rollback-awaits 'C:/Users/WINDOWS/AppData/Local/pi-stall-recovery-0.87.1-awaits-20260925T1234Z'
```

That command restores the offline-6 baseline, not pristine originals. It must
not be run on the currently empty directory. The launcher's `--inspect` setting
requires an authorized resolution before the guarded activation can continue.
