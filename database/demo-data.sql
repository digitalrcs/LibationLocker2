/*
  DigitalRCS Libation Locker - fictional demonstration data

  This optional script only replaces rows whose IDs begin with "demo-".
  Do not run it against a production database unless demo records are wanted.
*/

USE LibationLocker;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

DELETE FROM ll.ItemHistory WHERE ItemId LIKE N'demo-%';
DELETE FROM ll.Items WHERE Id LIKE N'demo-%';
DELETE FROM ll.ItemHistory WHERE ItemId LIKE N'demo-%';
DELETE FROM ll.Recipes WHERE Id LIKE N'demo-%';

INSERT ll.Items
    (Id, [Type], Brand, [Name], SizeMl, Abv, Qty, RemainingPct, NeedToBuy, Rating, Notes, UpdatedAtUtc, [Version])
VALUES
    (N'demo-bourbon-001', N'Bourbon', N'Northstar Demo Distillery', N'Small Batch Bourbon', 750, 45.00, 1, 55, 0, 9, N'Fictional demo item with caramel and oak notes.', SYSUTCDATETIME(), 3),
    (N'demo-gin-001', N'Gin', N'Example Spirits Co.', N'London Dry Gin', 750, 47.00, 1, 80, 0, 8, N'Fictional demo gin for classic cocktails.', SYSUTCDATETIME(), 2),
    (N'demo-tequila-001', N'Tequila', N'Sample Estate', N'Blanco Tequila', 750, 40.00, 1, 20, 1, 8, N'Fictional demo tequila marked for restock.', SYSUTCDATETIME(), 3),
    (N'demo-rum-001', N'Rum', N'Harbor Demo Reserve', N'Aged Rum', 750, 40.00, 2, 90, 0, 8, N'Fictional demo rum.', SYSUTCDATETIME(), 2),
    (N'demo-vodka-001', N'Vodka', N'Example Grain Works', N'Clean Vodka', 1000, 40.00, 1, 100, 0, 7, N'Fictional unopened demo bottle.', SYSUTCDATETIME(), 1),
    (N'demo-rye-001', N'Rye', N'Northstar Demo Distillery', N'Straight Rye Whiskey', 750, 50.00, 0, 0, 1, 9, N'Fictional empty demo bottle.', SYSUTCDATETIME(), 2),
    (N'demo-sweet-vermouth-001', N'Vermouth', N'Example Aperitivo House', N'Sweet Vermouth', 750, 16.00, 1, 40, 0, 8, N'Refrigerate after opening.', SYSUTCDATETIME(), 3),
    (N'demo-dry-vermouth-001', N'Vermouth', N'Example Aperitivo House', N'Dry Vermouth', 750, 18.00, 1, 70, 0, 8, N'Refrigerate after opening.', SYSUTCDATETIME(), 2),
    (N'demo-orange-liqueur-001', N'Liqueur', N'Demo Cellars', N'Orange Liqueur', 375, 30.00, 1, 30, 0, 8, N'Fictional cocktail staple.', SYSUTCDATETIME(), 3),
    (N'demo-bitters-001', N'Bitters', N'Sample House', N'Aromatic Bitters', 118, 45.00, 1, 60, 0, 9, N'Fictional aromatic bitters.', SYSUTCDATETIME(), 2),
    (N'demo-soda-001', N'Mixer', N'Example Mixer Co.', N'Club Soda', 355, 0.00, 6, 100, 0, 7, N'Fictional six-can demo stock.', SYSUTCDATETIME(), 3),
    (N'demo-lime-001', N'Mixer', N'Example Mixer Co.', N'Lime Juice', 750, 0.00, 1, 50, 1, 7, N'Fictional demo mixer marked for restock.', SYSUTCDATETIME(), 2);

DELETE FROM ll.ItemHistory WHERE ItemId LIKE N'demo-%';

INSERT ll.ItemTags (ItemId, Tag)
VALUES
    (N'demo-bourbon-001', N'old fashioned'), (N'demo-bourbon-001', N'whiskey'),
    (N'demo-gin-001', N'martini'), (N'demo-gin-001', N'negroni'),
    (N'demo-tequila-001', N'margarita'), (N'demo-rum-001', N'daiquiri'),
    (N'demo-vodka-001', N'highball'), (N'demo-rye-001', N'manhattan'),
    (N'demo-sweet-vermouth-001', N'manhattan'), (N'demo-sweet-vermouth-001', N'negroni'),
    (N'demo-dry-vermouth-001', N'martini'), (N'demo-orange-liqueur-001', N'margarita'),
    (N'demo-bitters-001', N'cocktail staple'), (N'demo-soda-001', N'mixer'),
    (N'demo-lime-001', N'citrus');

INSERT ll.ItemHistory
    (ItemId, EventType, [Type], Brand, [Name], AfterSizeMl, AfterQty, AfterRemainingPct, AfterNeedToBuy, AfterVersion, ChangedAtUtc)
SELECT Id, N'baseline', [Type], Brand, [Name], SizeMl,
       CASE Id
         WHEN N'demo-bourbon-001' THEN 2 WHEN N'demo-soda-001' THEN 8
         WHEN N'demo-lime-001' THEN 2 WHEN N'demo-rye-001' THEN 1 ELSE 1 END,
       CASE Id WHEN N'demo-rye-001' THEN 60 ELSE 100 END,
       0, 1, DATEADD(DAY, -45, SYSUTCDATETIME())
FROM ll.Items
WHERE Id LIKE N'demo-%';

INSERT ll.ItemHistory
    (ItemId, EventType, [Type], Brand, [Name], BeforeSizeMl, AfterSizeMl, BeforeQty, AfterQty,
     BeforeRemainingPct, AfterRemainingPct, BeforeNeedToBuy, AfterNeedToBuy, BeforeVersion, AfterVersion, ChangedAtUtc)
VALUES
    (N'demo-bourbon-001', N'update', N'Bourbon', N'Northstar Demo Distillery', N'Small Batch Bourbon', 750, 750, 2, 2, 100, 50, 0, 0, 1, 2, DATEADD(DAY, -30, SYSUTCDATETIME())),
    (N'demo-bourbon-001', N'update', N'Bourbon', N'Northstar Demo Distillery', N'Small Batch Bourbon', 750, 750, 2, 1, 50, 55, 0, 0, 2, 3, DATEADD(DAY, -10, SYSUTCDATETIME())),
    (N'demo-gin-001', N'update', N'Gin', N'Example Spirits Co.', N'London Dry Gin', 750, 750, 1, 1, 100, 80, 0, 0, 1, 2, DATEADD(DAY, -12, SYSUTCDATETIME())),
    (N'demo-tequila-001', N'update', N'Tequila', N'Sample Estate', N'Blanco Tequila', 750, 750, 1, 1, 100, 50, 0, 0, 1, 2, DATEADD(DAY, -15, SYSUTCDATETIME())),
    (N'demo-tequila-001', N'update', N'Tequila', N'Sample Estate', N'Blanco Tequila', 750, 750, 1, 1, 50, 20, 0, 1, 2, 3, DATEADD(DAY, -5, SYSUTCDATETIME())),
    (N'demo-rum-001', N'update', N'Rum', N'Harbor Demo Reserve', N'Aged Rum', 750, 750, 2, 2, 100, 90, 0, 0, 1, 2, DATEADD(DAY, -20, SYSUTCDATETIME())),
    (N'demo-rye-001', N'update', N'Rye', N'Northstar Demo Distillery', N'Straight Rye Whiskey', 750, 750, 1, 0, 60, 0, 0, 1, 1, 2, DATEADD(DAY, -10, SYSUTCDATETIME())),
    (N'demo-sweet-vermouth-001', N'update', N'Vermouth', N'Example Aperitivo House', N'Sweet Vermouth', 750, 750, 1, 1, 100, 70, 0, 0, 1, 2, DATEADD(DAY, -30, SYSUTCDATETIME())),
    (N'demo-sweet-vermouth-001', N'update', N'Vermouth', N'Example Aperitivo House', N'Sweet Vermouth', 750, 750, 1, 1, 70, 40, 0, 0, 2, 3, DATEADD(DAY, -2, SYSUTCDATETIME())),
    (N'demo-dry-vermouth-001', N'update', N'Vermouth', N'Example Aperitivo House', N'Dry Vermouth', 750, 750, 1, 1, 100, 70, 0, 0, 1, 2, DATEADD(DAY, -8, SYSUTCDATETIME())),
    (N'demo-orange-liqueur-001', N'update', N'Liqueur', N'Demo Cellars', N'Orange Liqueur', 375, 375, 1, 1, 100, 60, 0, 0, 1, 2, DATEADD(DAY, -20, SYSUTCDATETIME())),
    (N'demo-orange-liqueur-001', N'update', N'Liqueur', N'Demo Cellars', N'Orange Liqueur', 375, 375, 1, 1, 60, 30, 0, 0, 2, 3, DATEADD(DAY, -3, SYSUTCDATETIME())),
    (N'demo-bitters-001', N'update', N'Bitters', N'Sample House', N'Aromatic Bitters', 118, 118, 1, 1, 100, 60, 0, 0, 1, 2, DATEADD(DAY, -14, SYSUTCDATETIME())),
    (N'demo-soda-001', N'update', N'Mixer', N'Example Mixer Co.', N'Club Soda', 355, 355, 8, 7, 100, 100, 0, 0, 1, 2, DATEADD(DAY, -21, SYSUTCDATETIME())),
    (N'demo-soda-001', N'update', N'Mixer', N'Example Mixer Co.', N'Club Soda', 355, 355, 7, 6, 100, 100, 0, 0, 2, 3, DATEADD(DAY, -4, SYSUTCDATETIME())),
    (N'demo-lime-001', N'update', N'Mixer', N'Example Mixer Co.', N'Lime Juice', 750, 750, 2, 1, 100, 50, 0, 1, 1, 2, DATEADD(DAY, -14, SYSUTCDATETIME()));

INSERT ll.Recipes
    (Id, [Name], Category, Rating, FullMarkdown, SavedByUserId, SavedByEmail, CreatedAtUtc, UpdatedAtUtc, [Version])
VALUES
    (N'demo-recipe-old-fashioned', N'Demo Old Fashioned', N'Whiskey', 9, N'# Demo Old Fashioned\n\n- 60 ml bourbon\n- 2 dashes aromatic bitters\n- 1 tsp simple syrup\n\nStir with ice and strain over a large cube.', NULL, N'demo@digitalrcs.example', SYSUTCDATETIME(), SYSUTCDATETIME(), 1),
    (N'demo-recipe-martini', N'Demo Dry Martini', N'Classic', 8, N'# Demo Dry Martini\n\n- 75 ml gin\n- 15 ml dry vermouth\n\nStir with ice and strain into a chilled glass.', NULL, N'demo@digitalrcs.example', SYSUTCDATETIME(), SYSUTCDATETIME(), 1),
    (N'demo-recipe-margarita', N'Demo Margarita', N'Tequila', 9, N'# Demo Margarita\n\n- 60 ml blanco tequila\n- 30 ml orange liqueur\n- 30 ml lime juice\n\nShake with ice and strain.', NULL, N'demo@digitalrcs.example', SYSUTCDATETIME(), SYSUTCDATETIME(), 1),
    (N'demo-recipe-negroni', N'Demo Negroni', N'Classic', 8, N'# Demo Negroni\n\nCombine equal parts gin, sweet vermouth, and bitter aperitivo. Stir with ice.', NULL, N'demo@digitalrcs.example', SYSUTCDATETIME(), SYSUTCDATETIME(), 1),
    (N'demo-recipe-daiquiri', N'Demo Daiquiri', N'Rum', 8, N'# Demo Daiquiri\n\n- 60 ml aged rum\n- 30 ml lime juice\n- 20 ml simple syrup\n\nShake with ice and strain.', NULL, N'demo@digitalrcs.example', SYSUTCDATETIME(), SYSUTCDATETIME(), 1);

INSERT ll.RecipeTags (RecipeId, Tag)
VALUES
    (N'demo-recipe-old-fashioned', N'classic'), (N'demo-recipe-old-fashioned', N'whiskey'),
    (N'demo-recipe-martini', N'classic'), (N'demo-recipe-martini', N'gin'),
    (N'demo-recipe-margarita', N'citrus'), (N'demo-recipe-margarita', N'tequila'),
    (N'demo-recipe-negroni', N'bitter'), (N'demo-recipe-negroni', N'classic'),
    (N'demo-recipe-daiquiri', N'citrus'), (N'demo-recipe-daiquiri', N'rum');

COMMIT TRANSACTION;
GO

SELECT COUNT(*) AS DemoItems FROM ll.Items WHERE Id LIKE N'demo-%';
SELECT COUNT(*) AS DemoRecipes FROM ll.Recipes WHERE Id LIKE N'demo-%';
SELECT COUNT(*) AS DemoHistoryRows FROM ll.ItemHistory WHERE ItemId LIKE N'demo-%';
GO
