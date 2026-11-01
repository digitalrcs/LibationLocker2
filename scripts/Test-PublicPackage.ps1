[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Path
)

$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath($Path)
if (-not (Test-Path -LiteralPath $root -PathType Container)) {
    throw "Package staging directory does not exist: $root"
}

$requiredPaths = @(
    ".gitignore",
    "README.md",
    "LICENSE",
    "database\000_Setup.sql",
    "database\demo-data.sql",
    "docs\assets\digitalrcs-logo.png",
    "docs\assets\screenshots\inventory.jpg",
    "docs\assets\screenshots\usage-history.jpg",
    "src\LibationLocker.Web\wwwroot\branding\digitalrcs-logo.png",
    "wiki\Home.md"
)

$problems = [System.Collections.Generic.List[string]]::new()
foreach ($relativePath in $requiredPaths) {
    if (-not (Test-Path -LiteralPath (Join-Path $root $relativePath))) {
        $problems.Add("Missing required package file: $relativePath")
    }
}

$forbiddenDirectoryNames = @(".git", ".vs", ".vscode", "artifacts", "bin", "obj", "ExportedData", "Images")
Get-ChildItem -LiteralPath $root -Directory -Recurse -Force | ForEach-Object {
    if ($_.Name -in $forbiddenDirectoryNames) {
        $problems.Add("Forbidden directory included: $($_.FullName.Substring($root.Length).TrimStart('\'))")
    }
}

$forbiddenFileNames = @("appsettings.Local.json", "appsettings.Production.json")
Get-ChildItem -LiteralPath $root -File -Recurse -Force | ForEach-Object {
    if ($_.Name -in $forbiddenFileNames -or $_.Extension -in @(".bak", ".mdf", ".ldf")) {
        $problems.Add("Private or runtime file included: $($_.FullName.Substring($root.Length).TrimStart('\'))")
    }
}

$textExtensions = @(".bat", ".cs", ".cshtml", ".css", ".editorconfig", ".gitattributes", ".gitignore", ".js", ".json", ".md", ".ps1", ".sql", ".slnx", ".yml", ".yaml", ".config", ".csproj")
$sensitivePatterns = [ordered]@{
    "private IPv4 address" = '192\.168\.\d{1,3}\.\d{1,3}'
    "embedded SQL password" = '(?im)(^|;)\s*(Password|Pwd)\s*=\s*[^;\s"'']+'
    "embedded SQL user id" = '(?im)(^|;)\s*(User ID|Uid)\s*=\s*[^;\s"'']+'
}

Get-ChildItem -LiteralPath $root -File -Recurse -Force |
    Where-Object {
        $_.Extension -in $textExtensions -and
        $_.FullName -ne (Join-Path $root "scripts\Test-PublicPackage.ps1")
    } |
    ForEach-Object {
        $content = Get-Content -LiteralPath $_.FullName -Raw
        foreach ($entry in $sensitivePatterns.GetEnumerator()) {
            if ($content -match $entry.Value) {
                $relativePath = $_.FullName.Substring($root.Length).TrimStart('\')
                $problems.Add("$($entry.Key) found in $relativePath")
            }
        }
    }

if ($problems.Count -gt 0) {
    $message = "Public package audit failed:`n - " + ($problems -join "`n - ")
    throw $message
}

Write-Host "Public package audit passed: $root"
