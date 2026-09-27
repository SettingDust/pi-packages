$ErrorActionPreference = 'Stop'
$evidence = $PSScriptRoot
$previousWorkspace = $env:HERDR_WORKSPACE_ID
$created = herdr workspace create --cwd $evidence --label pi-t4-live --no-focus | ConvertFrom-Json
$id = $created.result.workspace.workspace_id
if (-not $id) { throw 'No isolated workspace ID returned' }
try {
    $env:HERDR_WORKSPACE_ID = $id
    bun (Join-Path $evidence 'live-acceptance.ts')
    $acceptanceExit = $LASTEXITCODE
} finally {
    if ($previousWorkspace) { $env:HERDR_WORKSPACE_ID = $previousWorkspace }
    else { Remove-Item Env:HERDR_WORKSPACE_ID -ErrorAction SilentlyContinue }
    herdr workspace close $id
}
exit $acceptanceExit
