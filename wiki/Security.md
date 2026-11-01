<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="320" /></p>

# Security

- Use HTTPS outside localhost.
- Replace the bootstrap administrator with a database-backed account.
- Remove bootstrap credentials after first setup.
- Use a low-privilege SQL identity.
- Keep SQL Server and LM Studio on trusted networks.
- Persist and protect ASP.NET Core Data Protection keys for production.
- Never publish exports, logs, backups, real inventory, or credential-bearing configuration.
