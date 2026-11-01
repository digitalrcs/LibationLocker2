<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="320" /></p>

# Troubleshooting

- **Database unavailable:** verify the instance, database name, authentication method, and runtime identity permissions.
- **Stored procedure missing:** apply every migration with `scripts/Initialize-Database.ps1`.
- **First login fails:** verify all three bootstrap environment variables and the database bootstrap-access flag.
- **AI offline:** verify the endpoint, firewall, loaded model, and model-list response.
- **AI stops near 100 seconds:** use the named AI client build and increase the configured operation timeout.
- **No usage history:** save inventory changes after installing the history migration; pre-migration history is unavailable.
- **IIS startup error:** verify the .NET 8 Hosting Bundle, No Managed Code app pool, connection string, and event logs.
