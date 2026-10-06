# Waves: Recovery Performance Correction

[Plan](plan.md) owns the gate definitions. Waves derive from the accepted Specs and do not create authority.

| Wave | Gates | Ordering and concurrency | Evidence |
| --- | --- | --- | --- |
| W1 | P0, P1, P2 | Specs/Work first, red tests next, implementation last; no concurrent source writers | Complete: three tests reproduced the defect and passed after repair; 1,803-task recovery writes zero manifests |
| W2 | P3 | Typecheck/LSP diagnostics and package tests can run independently; comparative benchmarks are serial; separate reviewer receives a read-only source packet | Complete: 239 tests / 0 fail, typecheck, benchmark and independent static review; Context records limits |

Review findings must be resolved before W2 is complete. Re-run checks only for changed code, failed tests, or unresolved concerns. Live provider/TTY acceptance of image transport remains in its separate Work.
