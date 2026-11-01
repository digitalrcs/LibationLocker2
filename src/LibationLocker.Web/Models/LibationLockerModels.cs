using System.Text.Json.Serialization;

namespace LibationLocker.Web.Models;

public sealed record ItemDto
{
    public string Id { get; init; } = "";
    public string Type { get; init; } = "";
    public string Brand { get; init; } = "";
    public string Name { get; init; } = "";
    public int SizeMl { get; init; } = 750;
    public decimal? Abv { get; init; }
    public int Qty { get; init; }
    public int RemainingPct { get; init; } = 100;
    public bool NeedToBuy { get; init; }
    public int Rating { get; init; }
    public string[] Tags { get; init; } = [];
    public string Notes { get; init; } = "";
    public long UpdatedAt { get; init; }
    public int Version { get; init; }
}

public sealed record ItemHistoryDto
{
    public long HistoryId { get; init; }
    public string ItemId { get; init; } = "";
    public string EventType { get; init; } = "";
    public string Type { get; init; } = "";
    public string Brand { get; init; } = "";
    public string Name { get; init; } = "";
    public int? BeforeSizeMl { get; init; }
    public int? AfterSizeMl { get; init; }
    public int? BeforeQty { get; init; }
    public int? AfterQty { get; init; }
    public int? BeforeRemainingPct { get; init; }
    public int? AfterRemainingPct { get; init; }
    public bool? BeforeNeedToBuy { get; init; }
    public bool? AfterNeedToBuy { get; init; }
    public int? BeforeVersion { get; init; }
    public int? AfterVersion { get; init; }
    public long ChangedAt { get; init; }
}

public sealed record DropdownConfigDto
{
    public string[] Types { get; init; } = [];
    public int[] SizesMl { get; init; } = [];
    public decimal[] AbvPresets { get; init; } = [];
    public int[] RemainingPresets { get; init; } = [];
    public AiConfigDto Ai { get; init; } = new();
    public AuthConfigDto Auth { get; init; } = new();
}

public sealed record AuthConfigDto
{
    public bool AllowDefaultAdmin { get; init; } = true;
}

public sealed record UserSummaryDto
{
    public string Id { get; init; } = "";
    public string Email { get; init; } = "";
    public string Role { get; init; } = "user";
    public bool IsActive { get; init; } = true;
    public long CreatedAt { get; init; }
    public long UpdatedAt { get; init; }
}

public sealed record UserLoginInfo
{
    public string Id { get; init; } = "";
    public string Email { get; init; } = "";
    public string PasswordHash { get; init; } = "";
    public string Role { get; init; } = "user";
    public bool IsActive { get; init; } = true;
}

public sealed record UserCreateRequest(string Email, string Password, string Role = "user");
public sealed record UserUpdateRequest(string Email, string Role, bool IsActive);
public sealed record SetPasswordRequest(string Password);

public sealed record AiConfigDto
{
    public bool Enabled { get; init; }
    public string Provider { get; init; } = "lmstudio";
    public string BaseUrl { get; init; } = "http://127.0.0.1:1234";
    public string Model { get; init; } = "";
    public string ApiKey { get; init; } = "";
    public string SystemPrompt { get; init; } = "";
    public decimal Temperature { get; init; } = 0.2m;
    public int MaxTokens { get; init; }
    public int TimeoutSec { get; init; } = 180;
    public bool DisableThinking { get; init; } = true;
    public bool StreamingEnabled { get; init; } = true;
    public bool TlsInsecure { get; init; }
    public AiModeDto[] Modes { get; init; } = DefaultAiModes;

    public static AiModeDto[] DefaultAiModes =>
    [
        new("general", "General", "Answer the question freely. You may provide recipes, cocktail knowledge, spirit education, purchase advice, or anything else the user asks about.", "", false),
        new("can_make_now", "Can Make Now", "List cocktails/drinks that can be made immediately from current inventory only. Short list with reasoning.", "", true),
        new("missing_ingredients", "Missing Ingredients", "Focus on drinks that are nearly possible. List what is missing item-by-item.", "", true),
        new("recommend_purchases", "Recommend Purchases", "Recommend highest-value purchases that unlock the most cocktails based on current inventory.", "", true),
        new("shopping_list", "Shopping List", "Build a practical shopping list grouped into: items, mixers, citrus, syrups, optional extras.", "", true)
    ];
}

public sealed record AiModeDto(
    string Id,
    string Label,
    string Instruction,
    string SystemPrompt,
    bool RestrictToInventory);

public sealed record ImportResultDto(bool Ok, string Mode, bool DryRun, int AddCount, int UpdateCount, int ConflictCount);

public sealed record ExportBundleDto
{
    public string App { get; init; } = "LibationLocker";
    public int Version { get; init; } = 2;
    public DropdownConfigDto Config { get; init; } = new();
    public ItemDto[] Items { get; init; } = [];
}

public sealed record RecipeDto
{
    public string Id { get; init; } = "";
    public string Name { get; init; } = "";
    public string Category { get; init; } = "Cocktail";
    public int Rating { get; init; }
    public string[] Tags { get; init; } = [];
    public string FullMarkdown { get; init; } = "";
    public string SavedByUserId { get; init; } = "";
    public string SavedByEmail { get; init; } = "";
    public long CreatedAt { get; init; }
    public long UpdatedAt { get; init; }
    public int Version { get; init; }
}

public sealed record AiAskRequest(string Question, bool IncludeInventory = true, string Mode = "general");

public sealed record AiAvailabilityDto
{
    public bool Enabled { get; init; }
    public bool Online { get; init; }
    public string Provider { get; init; } = "";
    public string BaseUrl { get; init; } = "";
    public int TimeoutSec { get; init; }
    public int ModelCount { get; init; }
    public string Status { get; init; } = "";
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Error { get; init; }
}

public sealed record AiJobStatusDto
{
    public bool Busy { get; init; }
    public bool Done { get; init; }
    public bool Ok { get; init; }
    public string Token { get; init; } = "";
    public string Kind { get; init; } = "";
    public bool InventoryIncluded { get; init; }
    public int InventoryItemCount { get; init; }
    public int InventoryTotalItems { get; init; }
    public string ModeUsed { get; init; } = "";
    public int HttpCode { get; init; }
    public long StartedAt { get; init; }
    public long FinishedAt { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Answer { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Error { get; init; }
}
