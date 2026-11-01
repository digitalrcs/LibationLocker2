<p align="center"><img src="assets/digitalrcs-logo.png" alt="DigitalRCS" width="360" /></p>

# Demo Data

The optional `database/demo-data.sql` file loads a fictional bar inventory so a new installation immediately demonstrates inventory cards, recipes, usage trends, reorder estimates, and item history.

## Load During Setup

```powershell
.\scripts\Initialize-Database.ps1 -SeedDemoData
```

## Load Separately

```powershell
sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -i database\demo-data.sql
```

## Contents

- 12 fictional inventory items across spirits, vermouth, bitters, and mixers.
- Five fictional cocktail recipes.
- Controlled baseline and update events spread across 45 days.
- Low-stock, empty, unopened, used, and restock-relevant states.
- Clearly fictional names and the reserved `.example` email domain.

The script only replaces records with IDs beginning `demo-`. It does not delete user-entered records. Do not run it on a production database unless demo records are intentionally desired.
