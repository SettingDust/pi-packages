Set-Location 'E:/Projects/pi-packages'
$ErrorActionPreference = 'Continue'
pi --no-extensions --no-skills --no-prompt-templates --no-context-files --no-themes --no-approve --offline --no-session --no-tools --thinking off --print '@packages/pi-herdr-subagents/.perf-investigation/review-complete-packet.md' *> packages/pi-herdr-subagents/.perf-investigation/complete-review.md
[IO.File]::WriteAllText((Join-Path $PWD 'packages/pi-herdr-subagents/.perf-investigation/complete-review.exit'), [string]$LASTEXITCODE)
