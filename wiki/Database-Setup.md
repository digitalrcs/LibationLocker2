<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="320" /></p>

# Database Setup

Libation Locker requires Microsoft SQL Server. Supported editions include LocalDB, Express, Developer, Standard, and Enterprise. SQLite and SQL Server Compact are not compatible with the stored procedures and triggers used by the application.

```powershell
.\scripts\Initialize-Database.ps1
.\scripts\Initialize-Database.ps1 -ServerInstance ".\SQLEXPRESS"
$credential = Get-Credential
.\scripts\Initialize-Database.ps1 -ServerInstance "sql.example.test" -Credential $credential
```

The script applies `001` through `004` in order. Back up an existing database before upgrades.
