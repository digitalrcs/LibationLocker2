<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="360" /></p>

# Server Edition vs. ESP32 Edition

DigitalRCS maintains two distinct Libation Locker implementations. This repository is the **Libation Locker 2 Server Edition**.

## Libation Locker 2 Server Edition

- Runs as a .NET 8 ASP.NET Core application.
- Uses Microsoft SQL Server for centralized, durable storage.
- Supports database-backed users and administrator roles.
- Adds recipes, item history, usage analytics, reorder estimates, and server-side backups.
- Can use LocalDB for a single-computer installation or full SQL Server for shared access.
- Deploys through Kestrel, IIS, or another ASP.NET Core hosting arrangement.

## Libation Locker ESP32 Edition

- Runs as firmware on ESP32-S3 hardware.
- Hosts its browser interface directly from the embedded device.
- Uses device-local embedded storage and Wi-Fi configuration.
- Is designed for a low-power, portable, appliance-style installation.
- Deploys by building and flashing firmware rather than publishing a .NET application.

## Choosing An Edition

Choose the **Server Edition** when centralized SQL storage, multiple users, long-term history, larger AI workloads, conventional backups, or IIS hosting matter. Choose the **ESP32 Edition** when a self-contained physical device and embedded deployment are the priority.

The two repositories should be installed and upgraded independently. Do not apply the SQL Server scripts in this repository to the ESP32 edition, and do not flash server-edition files to an ESP32 device.
