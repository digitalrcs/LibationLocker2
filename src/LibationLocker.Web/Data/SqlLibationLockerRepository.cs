using System.Data;
using System.Text.Json;
using LibationLocker.Web.Models;
using Microsoft.Data.SqlClient;

namespace LibationLocker.Web.Data;

public sealed class SqlLibationLockerRepository(IConfiguration configuration) : ILibationLockerRepository
{
    private readonly string _connectionString =
        configuration.GetConnectionString("LibationLocker")
        ?? throw new InvalidOperationException("Missing ConnectionStrings:LibationLocker.");

    public async Task<IReadOnlyList<ItemDto>> GetItemsAsync(CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_ItemList", con);
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        var items = new List<ItemDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(ReadItem(reader));
        }

        return items;
    }

    public async Task<ItemDto?> GetItemAsync(string id, CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_ItemGet", con);
        cmd.Parameters.AddWithValue("@Id", id);
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadItem(reader) : null;
    }

    public async Task<ItemDto> CreateItemAsync(ItemDto item, CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_ItemCreate", con);
        AddItemParameters(cmd, item, includeVersion: false);
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("The create stored procedure returned no item.");
        }

        return ReadItem(reader);
    }

    public async Task<ItemUpdateResult> UpdateItemAsync(ItemDto item, CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_ItemUpdate", con);
        cmd.Parameters.AddWithValue("@Id", item.Id);
        AddItemParameters(cmd, item, includeVersion: true);
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return ItemUpdateResult.NotFound();
        }

        var status = reader.GetString(reader.GetOrdinal("Status"));
        if (!await reader.NextResultAsync(cancellationToken) || !await reader.ReadAsync(cancellationToken))
        {
            return status == "not_found" ? ItemUpdateResult.NotFound() : ItemUpdateResult.NotFound();
        }

        var returned = ReadItem(reader);
        return status switch
        {
            "ok" => ItemUpdateResult.Updated(returned),
            "version_conflict" => ItemUpdateResult.Conflict(returned),
            _ => ItemUpdateResult.NotFound()
        };
    }

    public async Task<bool> DeleteItemAsync(string id, CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_ItemDelete", con);
        cmd.Parameters.AddWithValue("@Id", id);
        await con.OpenAsync(cancellationToken);
        var rows = Convert.ToInt32(await cmd.ExecuteScalarAsync(cancellationToken));
        return rows > 0;
    }

    public async Task<IReadOnlyList<ItemHistoryDto>> GetItemHistoryAsync(int days, string? itemId, CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_ItemHistoryList", con);
        cmd.Parameters.Add("@Days", SqlDbType.Int).Value = Math.Clamp(days, 1, 3650);
        cmd.Parameters.Add("@ItemId", SqlDbType.NVarChar, 32).Value = string.IsNullOrWhiteSpace(itemId)
            ? DBNull.Value
            : itemId.Trim();
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        var history = new List<ItemHistoryDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            history.Add(new ItemHistoryDto
            {
                HistoryId = reader.GetInt64(reader.GetOrdinal("HistoryId")),
                ItemId = reader.GetString(reader.GetOrdinal("ItemId")),
                EventType = reader.GetString(reader.GetOrdinal("EventType")),
                Type = reader.GetString(reader.GetOrdinal("Type")),
                Brand = reader.GetString(reader.GetOrdinal("Brand")),
                Name = reader.GetString(reader.GetOrdinal("Name")),
                BeforeSizeMl = NullableInt(reader, "BeforeSizeMl"),
                AfterSizeMl = NullableInt(reader, "AfterSizeMl"),
                BeforeQty = NullableInt(reader, "BeforeQty"),
                AfterQty = NullableInt(reader, "AfterQty"),
                BeforeRemainingPct = NullableInt(reader, "BeforeRemainingPct"),
                AfterRemainingPct = NullableInt(reader, "AfterRemainingPct"),
                BeforeNeedToBuy = NullableBool(reader, "BeforeNeedToBuy"),
                AfterNeedToBuy = NullableBool(reader, "AfterNeedToBuy"),
                BeforeVersion = NullableInt(reader, "BeforeVersion"),
                AfterVersion = NullableInt(reader, "AfterVersion"),
                ChangedAt = reader.GetInt64(reader.GetOrdinal("ChangedAt"))
            });
        }

        return history;
    }

    public async Task<DropdownConfigDto> GetConfigAsync(CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_ConfigGet", con);
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        var config = new DropdownConfigDto();
        if (await reader.ReadAsync(cancellationToken))
        {
            var json = reader.GetString(reader.GetOrdinal("ConfigJson"));
            config = JsonSerializer.Deserialize<DropdownConfigDto>(json, JsonOptions()) ?? new DropdownConfigDto();
        }

        return NormalizeConfig(config);
    }

    public async Task SaveConfigAsync(DropdownConfigDto config, CancellationToken cancellationToken)
    {
        var normalized = NormalizeConfig(config);
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_ConfigSave", con);
        cmd.Parameters.Add("@ConfigJson", SqlDbType.NVarChar, -1).Value = JsonSerializer.Serialize(normalized, JsonOptions());
        await con.OpenAsync(cancellationToken);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<ImportResultDto> ImportAsync(ExportBundleDto bundle, string mode, bool dryRun, CancellationToken cancellationToken)
    {
        mode = NormalizeImportMode(mode);
        var current = (await GetItemsAsync(cancellationToken)).ToDictionary(i => i.Id, StringComparer.OrdinalIgnoreCase);
        var addCount = 0;
        var updateCount = 0;
        var conflictCount = 0;

        if (mode == "replace")
        {
            addCount = bundle.Items.Length;
            if (!dryRun)
            {
                foreach (var item in current.Values)
                {
                    await DeleteItemAsync(item.Id, cancellationToken);
                }

                foreach (var item in bundle.Items)
                {
                    await CreateItemAsync(item with { Id = "" }, cancellationToken);
                }

                await SaveConfigAsync(bundle.Config, cancellationToken);
            }

            return new ImportResultDto(true, mode, dryRun, addCount, 0, 0);
        }

        foreach (var item in bundle.Items)
        {
            if (mode == "append" || string.IsNullOrWhiteSpace(item.Id) || !current.ContainsKey(item.Id))
            {
                addCount++;
                if (!dryRun)
                {
                    await CreateItemAsync(item with { Id = "" }, cancellationToken);
                }
                continue;
            }

            updateCount++;
            if (!dryRun)
            {
                var update = await UpdateItemAsync(item, cancellationToken);
                if (update.Status == "version_conflict")
                {
                    conflictCount++;
                }
            }
        }

        if (!dryRun)
        {
            await SaveConfigAsync(bundle.Config, cancellationToken);
        }

        return new ImportResultDto(true, mode, dryRun, addCount, updateCount, conflictCount);
    }

    public async Task<IReadOnlyList<RecipeDto>> GetRecipesAsync(CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_RecipeList", con);
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        var recipes = new List<RecipeDto>();
        while (await reader.ReadAsync(cancellationToken))
            recipes.Add(ReadRecipe(reader));
        return recipes;
    }

    public async Task<RecipeDto?> GetRecipeAsync(string id, CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_RecipeGet", con);
        cmd.Parameters.AddWithValue("@Id", id);
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadRecipe(reader) : null;
    }

    public async Task<RecipeDto> CreateRecipeAsync(RecipeDto recipe, string userId, string userEmail, CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_RecipeCreate", con);
        AddRecipeParameters(cmd, recipe);
        cmd.Parameters.Add("@SavedByUserId", SqlDbType.NVarChar, 32).Value = string.IsNullOrWhiteSpace(userId) ? DBNull.Value : userId;
        cmd.Parameters.Add("@SavedByEmail",  SqlDbType.NVarChar, 256).Value = userEmail ?? "";
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            throw new InvalidOperationException("The create stored procedure returned no recipe.");
        return ReadRecipe(reader);
    }

    public async Task<RecipeUpdateResult> UpdateRecipeAsync(RecipeDto recipe, CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_RecipeUpdate", con);
        cmd.Parameters.Add("@Id", SqlDbType.NVarChar, 32).Value = recipe.Id;
        AddRecipeParameters(cmd, recipe);
        cmd.Parameters.Add("@Version", SqlDbType.Int).Value = recipe.Version;
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
            return RecipeUpdateResult.NotFound();

        var status = reader.GetString(reader.GetOrdinal("Status"));
        if (!await reader.NextResultAsync(cancellationToken) || !await reader.ReadAsync(cancellationToken))
            return RecipeUpdateResult.NotFound();

        var returned = ReadRecipe(reader);
        return status switch
        {
            "ok"               => RecipeUpdateResult.Updated(returned),
            "version_conflict" => RecipeUpdateResult.Conflict(returned),
            _                  => RecipeUpdateResult.NotFound()
        };
    }

    public async Task<bool> DeleteRecipeAsync(string id, CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_RecipeDelete", con);
        cmd.Parameters.Add("@Id", SqlDbType.NVarChar, 32).Value = id;
        await con.OpenAsync(cancellationToken);
        var rows = Convert.ToInt32(await cmd.ExecuteScalarAsync(cancellationToken));
        return rows > 0;
    }

    public async Task<IReadOnlyList<UserSummaryDto>> GetUsersAsync(CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_UserList", con);
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        var users = new List<UserSummaryDto>();
        while (await reader.ReadAsync(cancellationToken))
            users.Add(ReadUserSummary(reader));
        return users;
    }

    public async Task<UserLoginInfo?> GetUserByEmailAsync(string email, CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_UserGetByEmail", con);
        cmd.Parameters.Add("@Email", SqlDbType.NVarChar, 256).Value = email.Trim();
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadUserLoginInfo(reader) : null;
    }

    public async Task<(string Status, string? Id)> CreateUserAsync(string email, string passwordHash, string role, CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_UserCreate", con);
        cmd.Parameters.Add("@Email",        SqlDbType.NVarChar, 256).Value = email.Trim();
        cmd.Parameters.Add("@PasswordHash", SqlDbType.NVarChar, 512).Value = passwordHash;
        cmd.Parameters.Add("@Role",         SqlDbType.NVarChar,  20).Value = role;
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return ("error", null);
        var status = reader.GetString(reader.GetOrdinal("Status"));
        var id = reader["Id"] == DBNull.Value ? null : reader.GetString(reader.GetOrdinal("Id"));
        return (status, id);
    }

    public async Task<string> UpdateUserAsync(string id, string email, string role, bool isActive, CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_UserUpdate", con);
        cmd.Parameters.Add("@Id",       SqlDbType.NVarChar, 32).Value  = id;
        cmd.Parameters.Add("@Email",    SqlDbType.NVarChar, 256).Value = email.Trim();
        cmd.Parameters.Add("@Role",     SqlDbType.NVarChar,  20).Value = role;
        cmd.Parameters.Add("@IsActive", SqlDbType.Bit).Value           = isActive;
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return "error";
        return reader.GetString(reader.GetOrdinal("Status"));
    }

    public async Task<string> SetUserPasswordAsync(string id, string passwordHash, CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_UserSetPassword", con);
        cmd.Parameters.Add("@Id",           SqlDbType.NVarChar, 32).Value  = id;
        cmd.Parameters.Add("@PasswordHash", SqlDbType.NVarChar, 512).Value = passwordHash;
        await con.OpenAsync(cancellationToken);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken)) return "error";
        return reader.GetString(reader.GetOrdinal("Status"));
    }

    public async Task<bool> DeleteUserAsync(string id, CancellationToken cancellationToken)
    {
        await using var con = new SqlConnection(_connectionString);
        await using var cmd = StoredProcedure("ll.usp_UserDelete", con);
        cmd.Parameters.Add("@Id", SqlDbType.NVarChar, 32).Value = id;
        await con.OpenAsync(cancellationToken);
        var rows = Convert.ToInt32(await cmd.ExecuteScalarAsync(cancellationToken));
        return rows > 0;
    }

    private static UserSummaryDto ReadUserSummary(SqlDataReader reader) => new()
    {
        Id        = reader.GetString(reader.GetOrdinal("Id")),
        Email     = reader.GetString(reader.GetOrdinal("Email")),
        Role      = reader.GetString(reader.GetOrdinal("Role")),
        IsActive  = reader.GetBoolean(reader.GetOrdinal("IsActive")),
        CreatedAt = reader.GetInt64(reader.GetOrdinal("CreatedAt")),
        UpdatedAt = reader.GetInt64(reader.GetOrdinal("UpdatedAt"))
    };

    private static UserLoginInfo ReadUserLoginInfo(SqlDataReader reader) => new()
    {
        Id           = reader.GetString(reader.GetOrdinal("Id")),
        Email        = reader.GetString(reader.GetOrdinal("Email")),
        PasswordHash = reader.GetString(reader.GetOrdinal("PasswordHash")),
        Role         = reader.GetString(reader.GetOrdinal("Role")),
        IsActive     = reader.GetBoolean(reader.GetOrdinal("IsActive"))
    };

    private static SqlCommand StoredProcedure(string name, SqlConnection connection) =>
        new(name, connection) { CommandType = CommandType.StoredProcedure };

    private static void AddItemParameters(SqlCommand cmd, ItemDto item, bool includeVersion)
    {
        cmd.Parameters.Add("@Type", SqlDbType.NVarChar, 80).Value = Trimmed(item.Type);
        cmd.Parameters.Add("@Brand", SqlDbType.NVarChar, 160).Value = Trimmed(item.Brand);
        cmd.Parameters.Add("@Name", SqlDbType.NVarChar, 160).Value = Trimmed(item.Name);
        cmd.Parameters.Add("@SizeMl", SqlDbType.Int).Value = item.SizeMl;
        cmd.Parameters.Add("@Abv", SqlDbType.Decimal).Value = item.Abv is null ? DBNull.Value : item.Abv;
        cmd.Parameters["@Abv"].Precision = 5;
        cmd.Parameters["@Abv"].Scale = 2;
        cmd.Parameters.Add("@Qty", SqlDbType.Int).Value = item.Qty;
        cmd.Parameters.Add("@RemainingPct", SqlDbType.Int).Value = item.RemainingPct;
        cmd.Parameters.Add("@NeedToBuy", SqlDbType.Bit).Value = item.NeedToBuy;
        cmd.Parameters.Add("@Rating", SqlDbType.Int).Value = item.Rating;
        cmd.Parameters.Add("@Notes", SqlDbType.NVarChar, -1).Value = item.Notes ?? "";
        cmd.Parameters.Add("@TagsJson", SqlDbType.NVarChar, -1).Value = JsonSerializer.Serialize(item.Tags ?? []);
        if (includeVersion)
        {
            cmd.Parameters.Add("@Version", SqlDbType.Int).Value = item.Version;
        }
    }

    private static ItemDto ReadItem(SqlDataReader reader)
    {
        var tagsCsv = reader["TagsCsv"] as string ?? "";
        return new ItemDto
        {
            Id = reader.GetString(reader.GetOrdinal("Id")),
            Type = reader.GetString(reader.GetOrdinal("Type")),
            Brand = reader.GetString(reader.GetOrdinal("Brand")),
            Name = reader.GetString(reader.GetOrdinal("Name")),
            SizeMl = reader.GetInt32(reader.GetOrdinal("SizeMl")),
            Abv = reader["Abv"] == DBNull.Value ? null : reader.GetDecimal(reader.GetOrdinal("Abv")),
            Qty = reader.GetInt32(reader.GetOrdinal("Qty")),
            RemainingPct = reader.GetInt32(reader.GetOrdinal("RemainingPct")),
            NeedToBuy = reader.GetBoolean(reader.GetOrdinal("NeedToBuy")),
            Rating = reader.GetInt32(reader.GetOrdinal("Rating")),
            Tags = tagsCsv.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries),
            Notes = reader.GetString(reader.GetOrdinal("Notes")),
            UpdatedAt = reader.GetInt64(reader.GetOrdinal("UpdatedAt")),
            Version = reader.GetInt32(reader.GetOrdinal("Version"))
        };
    }

    private static int? NullableInt(SqlDataReader reader, string column)
    {
        var ordinal = reader.GetOrdinal(column);
        return reader.IsDBNull(ordinal) ? null : reader.GetInt32(ordinal);
    }

    private static bool? NullableBool(SqlDataReader reader, string column)
    {
        var ordinal = reader.GetOrdinal(column);
        return reader.IsDBNull(ordinal) ? null : reader.GetBoolean(ordinal);
    }

    private static DropdownConfigDto NormalizeConfig(DropdownConfigDto config) =>
        config with
        {
            Types = config.Types.Length == 0 ? ["Bourbon", "Rye", "Gin", "Tequila", "Vodka", "Rum", "Scotch", "Liqueur"] : config.Types,
            SizesMl = config.SizesMl.Length == 0 ? [50, 200, 375, 750, 1000, 1750] : config.SizesMl,
            AbvPresets = config.AbvPresets.Length == 0 ? [35, 40, 45, 50, 55, 60] : config.AbvPresets,
            RemainingPresets = config.RemainingPresets.Length == 0 ? [100, 75, 50, 25, 10, 0] : config.RemainingPresets,
            Ai = config.Ai with
            {
                Temperature = Math.Clamp(config.Ai.Temperature, 0m, 2m),
                MaxTokens = string.Equals(config.Ai.Provider, "lmstudio", StringComparison.OrdinalIgnoreCase)
                    ? 0
                    : config.Ai.MaxTokens <= 0 ? 0 : Math.Max(config.Ai.MaxTokens, 64),
                TimeoutSec = Math.Max(config.Ai.TimeoutSec, 30),
                Modes = config.Ai.Modes.Length == 0 ? AiConfigDto.DefaultAiModes : config.Ai.Modes
            }
        };

    private static void AddRecipeParameters(SqlCommand cmd, RecipeDto recipe)
    {
        cmd.Parameters.Add("@Name",         SqlDbType.NVarChar,  200).Value = Trimmed(recipe.Name);
        cmd.Parameters.Add("@Category",     SqlDbType.NVarChar,   80).Value = Trimmed(recipe.Category);
        cmd.Parameters.Add("@Rating",       SqlDbType.Int).Value            = recipe.Rating;
        cmd.Parameters.Add("@FullMarkdown", SqlDbType.NVarChar,   -1).Value = recipe.FullMarkdown ?? "";
        cmd.Parameters.Add("@TagsJson",     SqlDbType.NVarChar,   -1).Value = JsonSerializer.Serialize(recipe.Tags ?? []);
    }

    private static RecipeDto ReadRecipe(SqlDataReader reader)
    {
        var tagsCsv = reader["TagsCsv"] as string ?? "";
        return new RecipeDto
        {
            Id            = reader.GetString(reader.GetOrdinal("Id")),
            Name          = reader.GetString(reader.GetOrdinal("Name")),
            Category      = reader.GetString(reader.GetOrdinal("Category")),
            Rating        = reader.GetInt32(reader.GetOrdinal("Rating")),
            FullMarkdown  = reader.GetString(reader.GetOrdinal("FullMarkdown")),
            SavedByUserId = reader["SavedByUserId"] == DBNull.Value ? "" : reader.GetString(reader.GetOrdinal("SavedByUserId")),
            SavedByEmail  = reader.GetString(reader.GetOrdinal("SavedByEmail")),
            CreatedAt     = reader.GetInt64(reader.GetOrdinal("CreatedAt")),
            UpdatedAt     = reader.GetInt64(reader.GetOrdinal("UpdatedAt")),
            Version       = reader.GetInt32(reader.GetOrdinal("Version")),
            Tags          = tagsCsv.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        };
    }

    private static string NormalizeImportMode(string? mode) =>
        string.Equals(mode, "replace", StringComparison.OrdinalIgnoreCase) ? "replace" :
        string.Equals(mode, "append", StringComparison.OrdinalIgnoreCase) ? "append" : "merge";

    private static string Trimmed(string? value) => (value ?? "").Trim();

    private static JsonSerializerOptions JsonOptions() => new(JsonSerializerDefaults.Web);
}
