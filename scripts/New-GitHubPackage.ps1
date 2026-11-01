[CmdletBinding()]
param(
    [string]$Version = "source"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$artifacts = Join-Path $repoRoot "artifacts"
$stage = Join-Path $artifacts "github\LibationLocker2"
$zipPath = Join-Path $artifacts "LibationLocker2-$Version-github.zip"

if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
New-Item -ItemType Directory -Path $stage -Force | Out-Null

$rootFiles = @(
    ".editorconfig", ".gitattributes", ".gitignore",
    "CHANGELOG.md", "CONTRIBUTING.md", "LICENSE", "README.md", "SECURITY.md",
    "LibationLocker2.slnx", "PublishApp.bat"
)
$directories = @(".github", "database", "docs", "scripts", "src", "wiki")

foreach ($file in $rootFiles) {
    $source = Join-Path $repoRoot $file
    if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $stage }
}
foreach ($directory in $directories) {
    Copy-Item -LiteralPath (Join-Path $repoRoot $directory) -Destination $stage -Recurse
}

Get-ChildItem -LiteralPath $stage -Directory -Recurse |
    Where-Object Name -in @("bin", "obj") |
    Sort-Object FullName -Descending |
    Remove-Item -Recurse -Force

& (Join-Path $PSScriptRoot "Test-PublicPackage.ps1") -Path $stage

$archiveItems = Get-ChildItem -LiteralPath $stage -Force | Select-Object -ExpandProperty FullName
Compress-Archive -Path $archiveItems -DestinationPath $zipPath -CompressionLevel Optimal
Write-Host "GitHub package created: $zipPath"
