<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="320" /></p>

# IIS Deployment

1. Install the .NET 8 ASP.NET Core Hosting Bundle.
2. Create an IIS app pool using **No Managed Code**.
3. Back up the site and database.
4. Apply required database migrations.
5. Run `.\scripts\Publish.ps1`.
6. Copy `artifacts\publish\LibationLocker` into a dedicated IIS site directory.
7. Preserve production `web.config`, secrets, Data Protection keys, and logs.
8. Restart the app pool and run the smoke checks from the deployment guide.

The publish script never writes to a production or shared network directory.
