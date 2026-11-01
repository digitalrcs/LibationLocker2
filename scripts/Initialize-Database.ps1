[CmdletBinding()]
param(
    [string]$ServerInstance = "(localdb)\MSSQLLocalDB",
    [PSCredential]$Credential,
    [switch]$SeedDemoData
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$databaseDirectory = Join-Path $repoRoot "database"
$scripts = @(
    "001_CreateLibationLocker.sql",
    "002_Users.sql",
    "003_Recipes.sql",
    "004_ItemHistory.sql"
)

$sqlcmd = Get-Command sqlcmd -ErrorAction Stop
$sqlcmdServer = $ServerInstance
if ($ServerInstance -match '^\(localdb\)\\(?<Instance>.+)$') {
    $localDb = Get-Command sqllocaldb -ErrorAction Stop
    $instanceName = $Matches.Instance
    & $localDb.Source start $instanceName | Out-Null
    $pipeLine = & $localDb.Source info $instanceName |
        Where-Object { $_ -match '^Instance pipe name:\s*(.+)$' } |
        Select-Object -First 1
    if (-not $pipeLine -or $pipeLine -notmatch '^Instance pipe name:\s*(.+)$') {
        throw "Unable to resolve the LocalDB pipe for $instanceName."
    }
    $sqlcmdServer = $Matches[1].Trim()
}

$common = @("-S", $sqlcmdServer, "-b")

if ($Credential) {
    $env:SQLCMDPASSWORD = $Credential.GetNetworkCredential().Password
    $common += @("-U", $Credential.UserName)
} else {
    $common += "-E"
}

try {
    foreach ($scriptName in $scripts) {
        $scriptPath = Join-Path $databaseDirectory $scriptName
        Write-Host "Applying $scriptName to $ServerInstance..."
        & $sqlcmd.Source @common -i $scriptPath
        if ($LASTEXITCODE -ne 0) { throw "$scriptName failed with exit code $LASTEXITCODE." }
    }

    if ($SeedDemoData) {
        $demoPath = Join-Path $databaseDirectory "demo-data.sql"
        Write-Host "Loading fictional demo data..."
        & $sqlcmd.Source @common -i $demoPath
        if ($LASTEXITCODE -ne 0) { throw "demo-data.sql failed with exit code $LASTEXITCODE." }
    }
} finally {
    Remove-Item Env:SQLCMDPASSWORD -ErrorAction SilentlyContinue
}

Write-Host "LibationLocker database setup completed successfully."
