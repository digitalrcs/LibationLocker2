<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="360" /></p>

# IIS Deployment

## Prerequisites

- Windows Server or Windows with IIS.
- ASP.NET Core Hosting Bundle for .NET 8.
- IIS application pool configured as **No Managed Code**.
- A production SQL Server database initialized with the scripts under `database/`.

## Publish

```powershell
.\scripts\Publish.ps1
```

Output is written to `artifacts/publish/LibationLocker`. The script never copies to a shared drive or production directory.

## Safe Deployment Order

For an existing Windows x64 installation, prefer the release's `iis-upgrade-win-x64.zip`. It excludes `web.config` and all `appsettings*.json` files. Copy its contents over the existing application without deleting or mirroring the destination. The full `app-win-x64.zip` includes defaults for new installations instead. See the [v2.1.0 upgrade notes](releases/v2.1.0.md), especially if you previously used the legacy built-in login.

1. Confirm the production connection string and IIS physical path.
2. Back up the production database and application directory.
3. Apply only the database migrations the production database does not already have.
4. Stop the Libation Locker application pool or place `app_offline.htm` in the site root.
5. Copy the published application files to the dedicated site directory.
6. Preserve production-managed `web.config`, connection strings, environment variables, Data Protection keys, and logs.
7. Start the application pool.
8. Verify login, inventory, recipes, AI status, statistics, `/api/item-history?days=30`, and a controlled Recent Changes entry.

## Production Environment Variables

Use IIS configuration, the application pool environment, or a managed secret store for:

- `ConnectionStrings__LibationLocker`
- `LibationLocker__BootstrapAdmin__Enabled`
- `LibationLocker__BootstrapAdmin__Email`
- `LibationLocker__BootstrapAdmin__Password`

Remove the bootstrap variables after a permanent administrator is established.

## Data Protection

ASP.NET Core authentication cookies use Data Protection. Persist the key ring outside the replaceable publish directory when stable cookies across restarts or multiple instances are required.
