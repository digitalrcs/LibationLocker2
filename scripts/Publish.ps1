[CmdletBinding()]
param(
    [string]$Configuration = "Release",
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$project = Join-Path $repoRoot "src\LibationLocker.Web\LibationLocker.Web.csproj"
if (-not $OutputPath) {
    $OutputPath = Join-Path $repoRoot "artifacts\publish\LibationLocker"
}

$resolvedRoot = [System.IO.Path]::GetFullPath($repoRoot)
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
if (-not $resolvedOutput.StartsWith($resolvedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "OutputPath must remain inside the repository. Requested: $resolvedOutput"
}

if (Test-Path -LiteralPath $resolvedOutput) {
    Remove-Item -LiteralPath $resolvedOutput -Recurse -Force
}
New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null

dotnet publish $project -c $Configuration -o $resolvedOutput
if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed with exit code $LASTEXITCODE." }

Write-Host "Published to $resolvedOutput"
