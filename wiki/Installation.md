<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="320" /></p>

# Installation

1. Install .NET 8, SQL Server 2016 or newer, and `sqlcmd`.
2. From the repository root, run `.\scripts\Initialize-Database.ps1 -SeedDemoData`.
3. Set the three `LibationLocker__BootstrapAdmin__*` environment variables described in the README.
4. Run `dotnet run --project .\src\LibationLocker.Web\LibationLocker.Web.csproj`.
5. Open `http://localhost:5058`.
6. Create a permanent admin, disable bootstrap access, and remove bootstrap credentials.

LocalDB is the default. Use `-ServerInstance ".\SQLEXPRESS"` for SQL Server Express or provide a remote instance name.
