/*
  Libation Locker SQL Server backend
  Run this in SSMS or sqlcmd as a login that can create databases.
*/

IF DB_ID(N'LibationLocker') IS NULL
BEGIN
    CREATE DATABASE LibationLocker;
END
GO

USE LibationLocker;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF SCHEMA_ID(N'll') IS NULL
    EXEC(N'CREATE SCHEMA ll');
GO

IF OBJECT_ID(N'll.Items', N'U') IS NULL
CREATE TABLE ll.Items
(
    Id nvarchar(32) NOT NULL CONSTRAINT PK_ll_Items PRIMARY KEY,
    [Type] nvarchar(80) NOT NULL,
    Brand nvarchar(160) NOT NULL,
    [Name] nvarchar(160) NOT NULL,
    SizeMl int NOT NULL CONSTRAINT DF_ll_Items_SizeMl DEFAULT 750,
    Abv decimal(5,2) NULL,
    Qty int NOT NULL CONSTRAINT DF_ll_Items_Qty DEFAULT 0,
    RemainingPct int NOT NULL CONSTRAINT DF_ll_Items_RemainingPct DEFAULT 100,
    NeedToBuy bit NOT NULL CONSTRAINT DF_ll_Items_NeedToBuy DEFAULT 0,
    Rating int NOT NULL CONSTRAINT DF_ll_Items_Rating DEFAULT 0,
    Notes nvarchar(max) NOT NULL CONSTRAINT DF_ll_Items_Notes DEFAULT N'',
    UpdatedAtUtc datetime2(0) NOT NULL CONSTRAINT DF_ll_Items_UpdatedAtUtc DEFAULT SYSUTCDATETIME(),
    [Version] int NOT NULL CONSTRAINT DF_ll_Items_Version DEFAULT 1,
    CONSTRAINT CK_ll_Items_RemainingPct CHECK (RemainingPct BETWEEN 0 AND 100),
    CONSTRAINT CK_ll_Items_Rating CHECK (Rating BETWEEN 0 AND 10),
    CONSTRAINT CK_ll_Items_Qty CHECK (Qty >= 0),
    CONSTRAINT CK_ll_Items_SizeMl CHECK (SizeMl > 0)
);
GO

IF OBJECT_ID(N'll.ItemTags', N'U') IS NULL
CREATE TABLE ll.ItemTags
(
    ItemId nvarchar(32) NOT NULL,
    Tag nvarchar(80) NOT NULL,
    CONSTRAINT PK_ll_ItemTags PRIMARY KEY (ItemId, Tag),
    CONSTRAINT FK_ll_ItemTags_Items FOREIGN KEY (ItemId) REFERENCES ll.Items(Id) ON DELETE CASCADE
);
GO

IF OBJECT_ID(N'll.AppConfig', N'U') IS NULL
CREATE TABLE ll.AppConfig
(
    ConfigKey nvarchar(40) NOT NULL CONSTRAINT PK_ll_AppConfig PRIMARY KEY,
    ConfigJson nvarchar(max) NOT NULL,
    UpdatedAtUtc datetime2(0) NOT NULL CONSTRAINT DF_ll_AppConfig_UpdatedAtUtc DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_ll_AppConfig_IsJson CHECK (ISJSON(ConfigJson) = 1)
);
GO

CREATE OR ALTER VIEW ll.vw_Items
AS
    SELECT
        i.Id,
        i.[Type],
        i.Brand,
        i.[Name],
        i.SizeMl,
        i.Abv,
        i.Qty,
        i.RemainingPct,
        i.NeedToBuy,
        i.Rating,
        i.Notes,
        CONVERT(bigint, DATEDIFF_BIG(SECOND, '19700101', i.UpdatedAtUtc)) AS UpdatedAt,
        i.[Version],
        ISNULL(STUFF((
            SELECT N'|' + t.Tag
            FROM ll.ItemTags t
            WHERE t.ItemId = i.Id
            ORDER BY t.Tag
            FOR XML PATH(N''), TYPE
        ).value(N'.', N'nvarchar(max)'), 1, 1, N''), N'') AS TagsCsv
    FROM ll.Items i;
GO

CREATE OR ALTER PROCEDURE ll.usp_ConfigGet
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM ll.AppConfig WHERE ConfigKey = N'default')
    BEGIN
        INSERT ll.AppConfig (ConfigKey, ConfigJson)
        VALUES
        (
            N'default',
            N'{"types":["Bourbon","Rye","Gin","Tequila","Vodka","Rum","Scotch","Liqueur"],"sizesMl":[50,200,375,750,1000,1750],"abvPresets":[35,40,45,50,55,60],"remainingPresets":[100,75,50,25,10,0],"ai":{"enabled":false,"provider":"lmstudio","baseUrl":"http://127.0.0.1:1234","model":"","apiKey":"","systemPrompt":"","temperature":0.2,"maxTokens":0,"timeoutSec":180,"disableThinking":true,"streamingEnabled":true,"tlsInsecure":false,"modes":[]},"auth":{"allowDefaultAdmin":true}}'
        );
    END

    SELECT ConfigJson FROM ll.AppConfig WHERE ConfigKey = N'default';
END
GO

CREATE OR ALTER PROCEDURE ll.usp_ConfigSave
    @ConfigJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON;

    IF ISJSON(@ConfigJson) <> 1
        THROW 50001, 'ConfigJson must be valid JSON.', 1;

    MERGE ll.AppConfig AS target
    USING (SELECT N'default' AS ConfigKey, @ConfigJson AS ConfigJson) AS source
    ON target.ConfigKey = source.ConfigKey
    WHEN MATCHED THEN
        UPDATE SET ConfigJson = source.ConfigJson, UpdatedAtUtc = SYSUTCDATETIME()
    WHEN NOT MATCHED THEN
        INSERT (ConfigKey, ConfigJson) VALUES (source.ConfigKey, source.ConfigJson);
END
GO

CREATE OR ALTER PROCEDURE ll.usp_ItemList
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM ll.vw_Items ORDER BY [Type], Brand, [Name];
END
GO

CREATE OR ALTER PROCEDURE ll.usp_ItemGet
    @Id nvarchar(32)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM ll.vw_Items WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE ll.usp_ItemCreate
    @Type nvarchar(80),
    @Brand nvarchar(160),
    @Name nvarchar(160),
    @SizeMl int,
    @Abv decimal(5,2) = NULL,
    @Qty int,
    @RemainingPct int,
    @NeedToBuy bit,
    @Rating int,
    @Notes nvarchar(max),
    @TagsJson nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Id nvarchar(32) = LOWER(REPLACE(CONVERT(nvarchar(36), NEWID()), N'-', N''));

    INSERT ll.Items (Id, [Type], Brand, [Name], SizeMl, Abv, Qty, RemainingPct, NeedToBuy, Rating, Notes)
    VALUES (@Id, @Type, @Brand, @Name, @SizeMl, @Abv, @Qty, @RemainingPct, @NeedToBuy, @Rating, ISNULL(@Notes, N''));

    INSERT ll.ItemTags (ItemId, Tag)
    SELECT @Id, LEFT(LTRIM(RTRIM([value])), 80)
    FROM OPENJSON(CASE WHEN ISJSON(@TagsJson) = 1 THEN @TagsJson ELSE N'[]' END)
    WHERE NULLIF(LTRIM(RTRIM([value])), N'') IS NOT NULL;

    SELECT * FROM ll.vw_Items WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE ll.usp_ItemUpdate
    @Id nvarchar(32),
    @Type nvarchar(80),
    @Brand nvarchar(160),
    @Name nvarchar(160),
    @SizeMl int,
    @Abv decimal(5,2) = NULL,
    @Qty int,
    @RemainingPct int,
    @NeedToBuy bit,
    @Rating int,
    @Notes nvarchar(max),
    @TagsJson nvarchar(max),
    @Version int
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM ll.Items WHERE Id = @Id)
    BEGIN
        SELECT N'not_found' AS [Status];
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM ll.Items WHERE Id = @Id AND [Version] = @Version)
    BEGIN
        SELECT N'version_conflict' AS [Status];
        SELECT * FROM ll.vw_Items WHERE Id = @Id;
        RETURN;
    END

    UPDATE ll.Items
    SET [Type] = @Type,
        Brand = @Brand,
        [Name] = @Name,
        SizeMl = @SizeMl,
        Abv = @Abv,
        Qty = @Qty,
        RemainingPct = @RemainingPct,
        NeedToBuy = @NeedToBuy,
        Rating = @Rating,
        Notes = ISNULL(@Notes, N''),
        UpdatedAtUtc = SYSUTCDATETIME(),
        [Version] = [Version] + 1
    WHERE Id = @Id;

    DELETE ll.ItemTags WHERE ItemId = @Id;

    INSERT ll.ItemTags (ItemId, Tag)
    SELECT @Id, LEFT(LTRIM(RTRIM([value])), 80)
    FROM OPENJSON(CASE WHEN ISJSON(@TagsJson) = 1 THEN @TagsJson ELSE N'[]' END)
    WHERE NULLIF(LTRIM(RTRIM([value])), N'') IS NOT NULL;

    SELECT N'ok' AS [Status];
    SELECT * FROM ll.vw_Items WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE ll.usp_ItemDelete
    @Id nvarchar(32)
AS
BEGIN
    SET NOCOUNT ON;
    DELETE ll.Items WHERE Id = @Id;
    SELECT @@ROWCOUNT AS DeletedRows;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ll_Items_TypeBrandName' AND object_id = OBJECT_ID(N'll.Items'))
    CREATE INDEX IX_ll_Items_TypeBrandName ON ll.Items ([Type], Brand, [Name]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ll_Items_NeedToBuy' AND object_id = OBJECT_ID(N'll.Items'))
    CREATE INDEX IX_ll_Items_NeedToBuy ON ll.Items (NeedToBuy) INCLUDE ([Type], Brand, [Name], Qty, RemainingPct);
GO
