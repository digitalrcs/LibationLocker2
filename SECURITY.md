<p align="center"><img src="docs/assets/digitalrcs-logo.png" alt="DigitalRCS" width="320" /></p>

# Security Policy

## Reporting A Vulnerability

Do not open a public GitHub issue for authentication bypasses, credential exposure, injection, data disclosure, or deployment vulnerabilities. Contact DigitalRCS privately through the contact method listed on the DigitalRCS GitHub profile and include affected versions, reproduction steps, impact, and any suggested mitigation.

## Deployment Expectations

- Never publish `appsettings.Production.json`, exports, logs, backups, or real inventory data.
- Keep connection strings and bootstrap credentials in environment variables, IIS configuration, or a managed secret store.
- Create a database-backed administrator, disable bootstrap access, and remove bootstrap credentials immediately after first setup.
- Terminate TLS at IIS or a reverse proxy before exposing the application outside a trusted network.
- Restrict SQL Server network access and grant the application only the permissions it requires.
- Treat LM Studio and other AI endpoints as trusted infrastructure; inventory context is sent to the configured endpoint when enabled.

## Supported Versions

Security fixes are applied to the current main branch. Older snapshots and unofficial packages may not receive updates.
