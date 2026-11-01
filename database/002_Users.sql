/*
  Libation Locker – User authentication migration
  Run this against the LibationLocker database after 001_CreateLibationLocker.sql.
*/

USE LibationLocker;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: ll.Users
-- ─────────────────────────────────────────────────────────────────────────────
IF OBJECT_ID(N'll.Users', N'U') IS NULL
CREATE TABLE ll.Users
(
    Id           nvarchar(32)  NOT NULL CONSTRAINT PK_ll_Users PRIMARY KEY,
    Email        nvarchar(256) NOT NULL,
    PasswordHash nvarchar(512) NOT NULL,
    [Role]       nvarchar(20)  NOT NULL CONSTRAINT DF_ll_Users_Role    DEFAULT N'user',
    IsActive     bit           NOT NULL CONSTRAINT DF_ll_Users_IsActive DEFAULT 1,
    CreatedAtUtc datetime2(0)  NOT NULL CONSTRAINT DF_ll_Users_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc datetime2(0)  NOT NULL CONSTRAINT DF_ll_Users_UpdatedAtUtc DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_ll_Users_Email UNIQUE (Email),
    CONSTRAINT CK_ll_Users_Role  CHECK ([Role] IN (N'admin', N'user'))
);
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- Stored Procedures
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR ALTER PROCEDURE ll.usp_UserList
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        Id, Email, [Role], IsActive,
        CONVERT(bigint, DATEDIFF_BIG(SECOND, '19700101', CreatedAtUtc)) AS CreatedAt,
        CONVERT(bigint, DATEDIFF_BIG(SECOND, '19700101', UpdatedAtUtc)) AS UpdatedAt
    FROM ll.Users
    ORDER BY Email;
END
GO

CREATE OR ALTER PROCEDURE ll.usp_UserGetByEmail
    @Email nvarchar(256)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Email, PasswordHash, [Role], IsActive
    FROM ll.Users
    WHERE Email = @Email;
END
GO

CREATE OR ALTER PROCEDURE ll.usp_UserCreate
    @Email        nvarchar(256),
    @PasswordHash nvarchar(512),
    @Role         nvarchar(20)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM ll.Users WHERE Email = @Email)
    BEGIN
        SELECT N'duplicate_email' AS [Status], NULL AS Id;
        RETURN;
    END

    DECLARE @Id nvarchar(32) = LOWER(REPLACE(CONVERT(nvarchar(36), NEWID()), N'-', N''));

    INSERT ll.Users (Id, Email, PasswordHash, [Role])
    VALUES (@Id, @Email, @PasswordHash, @Role);

    SELECT N'ok' AS [Status], @Id AS Id;
END
GO

CREATE OR ALTER PROCEDURE ll.usp_UserUpdate
    @Id       nvarchar(32),
    @Email    nvarchar(256),
    @Role     nvarchar(20),
    @IsActive bit
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM ll.Users WHERE Id = @Id)
    BEGIN
        SELECT N'not_found' AS [Status];
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM ll.Users WHERE Email = @Email AND Id <> @Id)
    BEGIN
        SELECT N'duplicate_email' AS [Status];
        RETURN;
    END

    UPDATE ll.Users
    SET Email        = @Email,
        [Role]       = @Role,
        IsActive     = @IsActive,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE Id = @Id;

    SELECT N'ok' AS [Status];
END
GO

CREATE OR ALTER PROCEDURE ll.usp_UserSetPassword
    @Id           nvarchar(32),
    @PasswordHash nvarchar(512)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM ll.Users WHERE Id = @Id)
    BEGIN
        SELECT N'not_found' AS [Status];
        RETURN;
    END

    UPDATE ll.Users
    SET PasswordHash = @PasswordHash,
        UpdatedAtUtc = SYSUTCDATETIME()
    WHERE Id = @Id;

    SELECT N'ok' AS [Status];
END
GO

CREATE OR ALTER PROCEDURE ll.usp_UserDelete
    @Id nvarchar(32)
AS
BEGIN
    SET NOCOUNT ON;
    DELETE ll.Users WHERE Id = @Id;
    SELECT @@ROWCOUNT AS DeletedRows;
END
GO
