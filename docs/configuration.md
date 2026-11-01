<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="360" /></p>

# Configuration

ASP.NET Core configuration precedence applies. Environment variables override values in `appsettings.json`; use double underscores for nested keys.

## Connection String

```powershell
$env:ConnectionStrings__LibationLocker = "Server=.\SQLEXPRESS;Database=LibationLocker;Trusted_Connection=True;TrustServerCertificate=True;"
```

## Bootstrap Administrator

```powershell
$env:LibationLocker__BootstrapAdmin__Enabled = "true"
$env:LibationLocker__BootstrapAdmin__Email = "admin@example.test"
$env:LibationLocker__BootstrapAdmin__Password = "use-a-long-unique-password"
```

The bootstrap account is only for first-run setup. Create a database-backed administrator, disable bootstrap login in the application, and remove these values from the host.

## Private JSON Configuration

`appsettings.Local.json` and `appsettings.Production.json` are ignored by Git. ASP.NET Core does not load `appsettings.Local.json` automatically; add it through host configuration only if you explicitly extend `Program.cs`. Environment variables are the supported no-code override.

## Database-Stored Settings

Inventory dropdown values, AI settings, AI modes, and the bootstrap-access flag are stored in `ll.AppConfig`. Back up the database before major configuration changes.

## HTTPS

The development profile listens on HTTP and HTTPS. Production deployments should terminate TLS at IIS or a reverse proxy and set forwarded-header behavior appropriate for the hosting environment.
