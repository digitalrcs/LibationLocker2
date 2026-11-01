<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="360" /></p>

# Security Guide

## Required Before Internet Exposure

- Use HTTPS.
- Create a database-backed administrator and disable bootstrap access.
- Remove bootstrap credentials from environment and IIS configuration.
- Use a dedicated SQL identity with minimal permissions.
- Restrict SQL Server and LM Studio to trusted networks.
- Store Data Protection keys securely outside the deployment directory.
- Back up the database and test restoration.

## Credentials And Repository Hygiene

Never commit passwords, API keys, connection strings containing credentials, user exports, database files, backups, logs, or screenshots containing private data. The package script uses a whitelist and excludes local runtime folders, but review the final archive before publishing.

## Authentication

Database passwords are hashed with PBKDF2-HMAC-SHA512 using per-password random salts and 310,000 iterations. Authentication cookies are encrypted and HTTP-only. Cookie security still depends on correct HTTPS and Data Protection configuration.

## AI

Inventory context can be sent to the configured model endpoint. A local endpoint reduces cloud exposure but does not remove the need to trust the host and network.

## Demo Data

The included demo records are fictional. Documentation screenshots must be captured from the demo LocalDB database, never from production.
