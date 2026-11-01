/*
  Libation Locker – Recipes table
  Run this against the LibationLocker database after 001 and 002 have been applied.
*/

USE LibationLocker;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'll.Recipes', N'U') IS NULL
CREATE TABLE ll.Recipes
(
    Id             nvarchar(32)   NOT NULL CONSTRAINT PK_ll_Recipes PRIMARY KEY,
    [Name]         nvarchar(200)  NOT NULL,
    Category       nvarchar(80)   NOT NULL CONSTRAINT DF_ll_Recipes_Category DEFAULT N'Cocktail',
    Rating         int            NOT NULL CONSTRAINT DF_ll_Recipes_Rating DEFAULT 0,
    FullMarkdown   nvarchar(max)  NOT NULL CONSTRAINT DF_ll_Recipes_FullMarkdown DEFAULT N'',
    SavedByUserId  nvarchar(32)   NULL,
    SavedByEmail   nvarchar(256)  NOT NULL CONSTRAINT DF_ll_Recipes_SavedByEmail DEFAULT N'',
    CreatedAtUtc   datetime2(0)   NOT NULL CONSTRAINT DF_ll_Recipes_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc   datetime2(0)   NOT NULL CONSTRAINT DF_ll_Recipes_UpdatedAtUtc DEFAULT SYSUTCDATETIME(),
    [Version]      int            NOT NULL CONSTRAINT DF_ll_Recipes_Version DEFAULT 1,
    CONSTRAINT CK_ll_Recipes_Rating CHECK (Rating BETWEEN 0 AND 10)
);
GO

IF OBJECT_ID(N'll.RecipeTags', N'U') IS NULL
CREATE TABLE ll.RecipeTags
(
    RecipeId nvarchar(32)  NOT NULL,
    Tag      nvarchar(80)  NOT NULL,
    CONSTRAINT PK_ll_RecipeTags PRIMARY KEY (RecipeId, Tag),
    CONSTRAINT FK_ll_RecipeTags_Recipes FOREIGN KEY (RecipeId) REFERENCES ll.Recipes(Id) ON DELETE CASCADE
);
GO

CREATE OR ALTER VIEW ll.vw_Recipes
AS
    SELECT
        r.Id,
        r.[Name],
        r.Category,
        r.Rating,
        r.FullMarkdown,
        r.SavedByUserId,
        r.SavedByEmail,
        CONVERT(bigint, DATEDIFF_BIG(SECOND, '19700101', r.CreatedAtUtc)) AS CreatedAt,
        CONVERT(bigint, DATEDIFF_BIG(SECOND, '19700101', r.UpdatedAtUtc)) AS UpdatedAt,
        r.[Version],
        ISNULL(STUFF((
            SELECT N'|' + t.Tag
            FROM ll.RecipeTags t
            WHERE t.RecipeId = r.Id
            ORDER BY t.Tag
            FOR XML PATH(N''), TYPE
        ).value(N'.', N'nvarchar(max)'), 1, 1, N''), N'') AS TagsCsv
    FROM ll.Recipes r;
GO

CREATE OR ALTER PROCEDURE ll.usp_RecipeList
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM ll.vw_Recipes ORDER BY [Name];
END
GO

CREATE OR ALTER PROCEDURE ll.usp_RecipeGet
    @Id nvarchar(32)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM ll.vw_Recipes WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE ll.usp_RecipeCreate
    @Name         nvarchar(200),
    @Category     nvarchar(80),
    @Rating       int,
    @FullMarkdown nvarchar(max),
    @TagsJson     nvarchar(max),
    @SavedByUserId nvarchar(32) = NULL,
    @SavedByEmail  nvarchar(256) = N''
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Id nvarchar(32) = LOWER(REPLACE(CONVERT(nvarchar(36), NEWID()), N'-', N''));

    INSERT ll.Recipes (Id, [Name], Category, Rating, FullMarkdown, SavedByUserId, SavedByEmail)
    VALUES (@Id, @Name, @Category, @Rating, ISNULL(@FullMarkdown, N''), @SavedByUserId, ISNULL(@SavedByEmail, N''));

    INSERT ll.RecipeTags (RecipeId, Tag)
    SELECT @Id, LEFT(LTRIM(RTRIM([value])), 80)
    FROM OPENJSON(CASE WHEN ISJSON(@TagsJson) = 1 THEN @TagsJson ELSE N'[]' END)
    WHERE NULLIF(LTRIM(RTRIM([value])), N'') IS NOT NULL;

    SELECT * FROM ll.vw_Recipes WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE ll.usp_RecipeUpdate
    @Id           nvarchar(32),
    @Name         nvarchar(200),
    @Category     nvarchar(80),
    @Rating       int,
    @FullMarkdown nvarchar(max),
    @TagsJson     nvarchar(max),
    @Version      int
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM ll.Recipes WHERE Id = @Id)
    BEGIN
        SELECT N'not_found' AS [Status];
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM ll.Recipes WHERE Id = @Id AND [Version] = @Version)
    BEGIN
        SELECT N'version_conflict' AS [Status];
        SELECT * FROM ll.vw_Recipes WHERE Id = @Id;
        RETURN;
    END

    UPDATE ll.Recipes
    SET [Name]       = @Name,
        Category     = @Category,
        Rating       = @Rating,
        FullMarkdown = ISNULL(@FullMarkdown, N''),
        UpdatedAtUtc = SYSUTCDATETIME(),
        [Version]    = [Version] + 1
    WHERE Id = @Id;

    DELETE ll.RecipeTags WHERE RecipeId = @Id;

    INSERT ll.RecipeTags (RecipeId, Tag)
    SELECT @Id, LEFT(LTRIM(RTRIM([value])), 80)
    FROM OPENJSON(CASE WHEN ISJSON(@TagsJson) = 1 THEN @TagsJson ELSE N'[]' END)
    WHERE NULLIF(LTRIM(RTRIM([value])), N'') IS NOT NULL;

    SELECT N'ok' AS [Status];
    SELECT * FROM ll.vw_Recipes WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE ll.usp_RecipeDelete
    @Id nvarchar(32)
AS
BEGIN
    SET NOCOUNT ON;
    DELETE ll.Recipes WHERE Id = @Id;
    SELECT @@ROWCOUNT AS DeletedRows;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ll_Recipes_Name' AND object_id = OBJECT_ID(N'll.Recipes'))
    CREATE INDEX IX_ll_Recipes_Name ON ll.Recipes ([Name]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ll_Recipes_Category' AND object_id = OBJECT_ID(N'll.Recipes'))
    CREATE INDEX IX_ll_Recipes_Category ON ll.Recipes (Category);
GO
