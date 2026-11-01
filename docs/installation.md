<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="360" /></p>

# Installation

## Supported Platform

Libation Locker targets .NET 8 and can run anywhere ASP.NET Core and Microsoft SQL Server are reachable. The included local setup is Windows-focused because SQL Server LocalDB is Windows-only.

## Prerequisites

- .NET 8 SDK for source builds, or the .NET 8 ASP.NET Core Runtime for framework-dependent published builds.
- SQL Server 2016 or newer with database creation rights during setup.
- SQL Server LocalDB, Express, Developer, Standard, or Enterprise.
- `sqlcmd` on the machine running the setup scripts.

SQL Server must use compatibility level 130 or newer because the database uses `OPENJSON`.

## Local Windows Setup

```powershell
git clone https://github.com/digitalrcs/LibationLocker2.git
cd LibationLocker2
.\scripts\Initialize-Database.ps1 -SeedDemoData

$env:LibationLocker__BootstrapAdmin__Enabled = "true"
$env:LibationLocker__BootstrapAdmin__Email = "admin@example.test"
$env:LibationLocker__BootstrapAdmin__Password = "use-a-long-unique-password"

dotnet run --project .\src\LibationLocker.Web\LibationLocker.Web.csproj
```

Browse to `http://localhost:5058`.

## First-Run Checklist

1. Sign in with the temporary bootstrap administrator.
2. Open **Admin > Users** and create a permanent administrator.
3. Sign out and verify the permanent account.
4. Disable the bootstrap administrator under **Admin > Users**.
5. Remove the three bootstrap environment variables from the host.
6. Configure LM Studio only if the optional AI feature is required.

## Empty Installation

Omit `-SeedDemoData` when initializing the database. The application will start with an empty inventory and recipe library.
