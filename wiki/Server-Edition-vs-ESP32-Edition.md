<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="320" /></p>

# Server Edition vs. ESP32 Edition

The **Server Edition** in this repository runs on .NET 8 and Microsoft SQL Server. It is intended for centralized storage, multiple users, recipes, item history, analytics, conventional backups, and IIS or Kestrel hosting.

The separate **ESP32 Edition** runs as firmware on ESP32-S3 hardware. It hosts an appliance-style browser interface from the embedded device and uses device-local storage and Wi-Fi configuration.

| Choose Server Edition for | Choose ESP32 Edition for |
|---|---|
| Shared browser access | A self-contained physical device |
| SQL Server persistence | Embedded local storage |
| User accounts and roles | Appliance-style local access |
| Recipes and long-term analytics | Low-power portable deployment |
| IIS/Kestrel hosting | Firmware build and flashing |

Install and upgrade the editions independently.
