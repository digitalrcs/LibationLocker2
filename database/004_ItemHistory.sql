/*
  Libation Locker - inventory history migration
  Run this against the LibationLocker database after 001, 002, and 003.
*/

USE LibationLocker;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID(N'll.ItemHistory', N'U') IS NULL
BEGIN
    CREATE TABLE ll.ItemHistory
    (
        HistoryId bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_ll_ItemHistory PRIMARY KEY,
        ItemId nvarchar(32) NOT NULL,
        EventType nvarchar(12) NOT NULL,
        [Type] nvarchar(80) NOT NULL,
        Brand nvarchar(160) NOT NULL,
        [Name] nvarchar(160) NOT NULL,
        BeforeSizeMl int NULL,
        AfterSizeMl int NULL,
        BeforeQty int NULL,
        AfterQty int NULL,
        BeforeRemainingPct int NULL,
        AfterRemainingPct int NULL,
        BeforeNeedToBuy bit NULL,
        AfterNeedToBuy bit NULL,
        BeforeVersion int NULL,
        AfterVersion int NULL,
        ChangedAtUtc datetime2(0) NOT NULL CONSTRAINT DF_ll_ItemHistory_ChangedAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_ll_ItemHistory_EventType CHECK (EventType IN (N'baseline', N'create', N'update', N'delete'))
    );
END
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_ll_ItemHistory_ItemChanged'
      AND object_id = OBJECT_ID(N'll.ItemHistory')
)
    CREATE INDEX IX_ll_ItemHistory_ItemChanged
        ON ll.ItemHistory (ItemId, ChangedAtUtc DESC, HistoryId DESC);
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_ll_ItemHistory_ChangedAt'
      AND object_id = OBJECT_ID(N'll.ItemHistory')
)
    CREATE INDEX IX_ll_ItemHistory_ChangedAt
        ON ll.ItemHistory (ChangedAtUtc DESC)
        INCLUDE (ItemId, EventType, BeforeQty, AfterQty, BeforeRemainingPct, AfterRemainingPct);
GO

INSERT ll.ItemHistory
(
    ItemId, EventType, [Type], Brand, [Name],
    AfterSizeMl, AfterQty, AfterRemainingPct, AfterNeedToBuy, AfterVersion,
    ChangedAtUtc
)
SELECT
    i.Id, N'baseline', i.[Type], i.Brand, i.[Name],
    i.SizeMl, i.Qty, i.RemainingPct, i.NeedToBuy, i.[Version],
    SYSUTCDATETIME()
FROM ll.Items i
WHERE NOT EXISTS
(
    SELECT 1
    FROM ll.ItemHistory h
    WHERE h.ItemId = i.Id
      AND h.EventType = N'baseline'
);
GO

CREATE OR ALTER TRIGGER ll.trg_Items_History
ON ll.Items
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT ll.ItemHistory
    (
        ItemId, EventType, [Type], Brand, [Name],
        BeforeSizeMl, AfterSizeMl,
        BeforeQty, AfterQty,
        BeforeRemainingPct, AfterRemainingPct,
        BeforeNeedToBuy, AfterNeedToBuy,
        BeforeVersion, AfterVersion,
        ChangedAtUtc
    )
    SELECT
        COALESCE(i.Id, d.Id),
        CASE
            WHEN d.Id IS NULL THEN N'create'
            WHEN i.Id IS NULL THEN N'delete'
            ELSE N'update'
        END,
        COALESCE(i.[Type], d.[Type]),
        COALESCE(i.Brand, d.Brand),
        COALESCE(i.[Name], d.[Name]),
        d.SizeMl,
        i.SizeMl,
        d.Qty,
        i.Qty,
        d.RemainingPct,
        i.RemainingPct,
        d.NeedToBuy,
        i.NeedToBuy,
        d.[Version],
        i.[Version],
        SYSUTCDATETIME()
    FROM inserted i
    FULL OUTER JOIN deleted d ON d.Id = i.Id;
END
GO

CREATE OR ALTER PROCEDURE ll.usp_ItemHistoryList
    @Days int = 90,
    @ItemId nvarchar(32) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SET @Days = CASE WHEN @Days < 1 THEN 1 WHEN @Days > 3650 THEN 3650 ELSE @Days END;
    DECLARE @SinceUtc datetime2(0) = DATEADD(DAY, -@Days, SYSUTCDATETIME());

    ;WITH PriorRows AS
    (
        SELECT
            h.HistoryId,
            ROW_NUMBER() OVER
            (
                PARTITION BY h.ItemId
                ORDER BY h.ChangedAtUtc DESC, h.HistoryId DESC
            ) AS RowNumber
        FROM ll.ItemHistory h
        WHERE h.ChangedAtUtc < @SinceUtc
          AND (@ItemId IS NULL OR h.ItemId = @ItemId)
    ),
    IncludedRows AS
    (
        SELECT h.HistoryId
        FROM ll.ItemHistory h
        WHERE h.ChangedAtUtc >= @SinceUtc
          AND (@ItemId IS NULL OR h.ItemId = @ItemId)

        UNION

        SELECT HistoryId
        FROM PriorRows
        WHERE RowNumber = 1
    )
    SELECT
        h.HistoryId,
        h.ItemId,
        h.EventType,
        h.[Type],
        h.Brand,
        h.[Name],
        h.BeforeSizeMl,
        h.AfterSizeMl,
        h.BeforeQty,
        h.AfterQty,
        h.BeforeRemainingPct,
        h.AfterRemainingPct,
        h.BeforeNeedToBuy,
        h.AfterNeedToBuy,
        h.BeforeVersion,
        h.AfterVersion,
        CONVERT(bigint, DATEDIFF_BIG(SECOND, '19700101', h.ChangedAtUtc)) AS ChangedAt
    FROM ll.ItemHistory h
    INNER JOIN IncludedRows included ON included.HistoryId = h.HistoryId
    ORDER BY h.ChangedAtUtc, h.HistoryId;
END
GO
