<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="360" /></p>

# Database Setup

Libation Locker uses Microsoft SQL Server features and does not support SQLite or SQL Server Compact. The same schema works on LocalDB, Express, Developer, Standard, and Enterprise editions.

## Automated Setup

LocalDB with Windows authentication:

```powershell
.\scripts\Initialize-Database.ps1
```

SQL Server Express:

```powershell
.\scripts\Initialize-Database.ps1 -ServerInstance ".\SQLEXPRESS"
```

Remote SQL Server with Windows authentication:

```powershell
.\scripts\Initialize-Database.ps1 -ServerInstance "sql.example.test"
```

SQL authentication without putting the password on the command line:

```powershell
$credential = Get-Credential
.\scripts\Initialize-Database.ps1 -ServerInstance "sql.example.test" -Credential $credential
```

Add `-SeedDemoData` to load fictional sample records.

## Single SQLCMD Entry Point

From the repository root:

```powershell
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -i database\000_Setup.sql
```

`database/000_Setup.sql` applies these rerunnable scripts in order:

1. `001_CreateLibationLocker.sql` - database, inventory, configuration, views, and inventory procedures.
2. `002_Users.sql` - users and authentication procedures.
3. `003_Recipes.sql` - recipes, tags, views, and procedures.
4. `004_ItemHistory.sql` - append-only item history, indexes, trigger, and history query procedure.

In SSMS, enable **SQLCMD Mode** before executing `000_Setup.sql` because it uses `:r` includes.

## Application Connection Strings

LocalDB default:

```text
Server=(localdb)\MSSQLLocalDB;Database=LibationLocker;Trusted_Connection=True;MultipleActiveResultSets=True;TrustServerCertificate=True;
```

SQL Server Express with Windows authentication:

```text
Server=.\SQLEXPRESS;Database=LibationLocker;Trusted_Connection=True;TrustServerCertificate=True;
```

Remote SQL Server should normally use encryption and a trusted certificate:

```text
Server=sql.example.test;Database=LibationLocker;Integrated Security=True;Encrypt=True;TrustServerCertificate=False;
```

Supply the connection string through `ConnectionStrings__LibationLocker`. Do not commit production credentials.

## Permissions

The setup identity needs permission to create a database and schema objects. The runtime identity needs to connect to `LibationLocker` and execute objects in the `ll` schema. Prefer Windows authentication with a dedicated IIS application-pool identity or a dedicated low-privilege SQL login.

## Upgrades

Back up the database before applying new migration scripts. The history migration seeds one baseline per existing item; pre-migration history cannot be reconstructed.
