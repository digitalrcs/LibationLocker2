<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="320" /></p>

# Demo Data

Use `-SeedDemoData` to load 12 fictional inventory items, five recipes, and controlled history events:

```powershell
.\scripts\Initialize-Database.ps1 -SeedDemoData
```

Demo IDs begin with `demo-`. The script replaces only those records and does not delete user-created inventory. Do not load demo records into production unless that is intentional.
