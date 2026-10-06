Set-Location 'E:/Projects/pi-packages/packages/pi-herdr-subagents'
$ErrorActionPreference = 'Continue'
bun test *> .perf-investigation/package-tests.log
[IO.File]::WriteAllText((Join-Path $PWD '.perf-investigation/package-tests.exit'), [string]$LASTEXITCODE)
