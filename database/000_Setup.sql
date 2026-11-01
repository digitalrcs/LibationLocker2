/*
  DigitalRCS Libation Locker - complete SQL Server setup

  Run from the repository root with sqlcmd so the :r paths resolve:
    sqlcmd -S "(localdb)\MSSQLLocalDB" -E -b -i database\000_Setup.sql

  In SQL Server Management Studio, enable SQLCMD Mode and set the working
  directory to the repository root before executing this file.
*/

:On Error exit

PRINT N'Creating or updating LibationLocker...';
:r .\database\001_CreateLibationLocker.sql
:r .\database\002_Users.sql
:r .\database\003_Recipes.sql
:r .\database\004_ItemHistory.sql
PRINT N'LibationLocker database setup complete.';
