<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="360" /></p>

# Troubleshooting

## Database Login Or Connection Failure

- Confirm the server instance in `ConnectionStrings__LibationLocker`.
- Confirm the `LibationLocker` database exists on that instance.
- For LocalDB, run `sqllocaldb info MSSQLLocalDB`.
- For Windows authentication, confirm the current user or IIS application-pool identity has database access.
- For SQL authentication, verify the login without placing the password in source files or command history.

## Stored Procedure Not Found

Run all migrations in order with `scripts/Initialize-Database.ps1`. An application update that adds a migration requires the matching database update.

## Cannot Sign In On First Run

Confirm all three bootstrap settings are present in the process environment and that bootstrap access has not already been disabled in **Admin > Users**.

## AI Shows Offline

Confirm the configured endpoint is reachable from the web server and that a model is loaded. The availability check calls the model-list endpoint with a short timeout.

## AI Stops Near 100 Seconds

Use a build containing the named `ai` HTTP client and set the configured AI timeout above the expected generation time. Reverse proxies and load balancers can also impose independent timeouts.

## Empty Usage Charts

Usage trends begin when item history is installed and inventory changes are saved. Existing inventory receives a baseline; earlier consumption cannot be reconstructed.

## IIS 500.30 Or Startup Failure

- Install or repair the .NET 8 ASP.NET Core Hosting Bundle.
- Set the application pool to **No Managed Code**.
- Review the Windows Event Log and configured application logs.
- Verify the production connection string and SQL permissions.
