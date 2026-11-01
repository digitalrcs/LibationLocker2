<p align="center"><img src="docs/assets/digitalrcs-logo.png" alt="DigitalRCS" width="320" /></p>

# Contributing

Thank you for helping improve DigitalRCS Libation Locker.

## Development Setup

1. Install the .NET 8 SDK and SQL Server LocalDB, Express, or a reachable SQL Server instance.
2. Run `.\scripts\Initialize-Database.ps1 -SeedDemoData`.
3. Configure a temporary bootstrap administrator as described in the README.
4. Run `dotnet build .\src\LibationLocker.Web\LibationLocker.Web.csproj`.
5. Start the app with `dotnet run --project .\src\LibationLocker.Web\LibationLocker.Web.csproj`.

## Pull Requests

- Keep changes focused and consistent with the existing Razor Pages and repository patterns.
- Do not commit connection strings, passwords, API keys, exports, logs, database backups, or real inventory data.
- Add or update documentation for user-visible behavior and configuration changes.
- Validate SQL scripts against a disposable LocalDB or test SQL Server database.
- Run the build, JavaScript syntax check, and relevant browser workflow before submitting.

## Database Changes

Add incremental, rerunnable scripts under `database/` and update `database/000_Setup.sql`, `scripts/Initialize-Database.ps1`, and `docs/database.md`. Never rewrite an already-deployed migration in a way that changes existing production data unexpectedly.
