<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="320" /></p>

# Configuration

Use environment variables for secrets and host-specific values:

- `ConnectionStrings__LibationLocker`
- `LibationLocker__BootstrapAdmin__Enabled`
- `LibationLocker__BootstrapAdmin__Email`
- `LibationLocker__BootstrapAdmin__Password`

The checked-in `appsettings.json` contains only a credential-free LocalDB connection. Never commit production connection strings, passwords, API keys, exports, logs, or backups.
