using LibationLocker.Web.Models;

namespace LibationLocker.Web.Data;

public interface ILibationLockerRepository
{
    Task<IReadOnlyList<ItemDto>> GetItemsAsync(CancellationToken cancellationToken);
    Task<ItemDto?> GetItemAsync(string id, CancellationToken cancellationToken);
    Task<ItemDto> CreateItemAsync(ItemDto item, CancellationToken cancellationToken);
    Task<ItemUpdateResult> UpdateItemAsync(ItemDto item, CancellationToken cancellationToken);
    Task<bool> DeleteItemAsync(string id, CancellationToken cancellationToken);
    Task<IReadOnlyList<ItemHistoryDto>> GetItemHistoryAsync(int days, string? itemId, CancellationToken cancellationToken);
    Task<DropdownConfigDto> GetConfigAsync(CancellationToken cancellationToken);
    Task SaveConfigAsync(DropdownConfigDto config, CancellationToken cancellationToken);
    Task<ImportResultDto> ImportAsync(ExportBundleDto bundle, string mode, bool dryRun, CancellationToken cancellationToken);

    Task<IReadOnlyList<RecipeDto>> GetRecipesAsync(CancellationToken cancellationToken);
    Task<RecipeDto?> GetRecipeAsync(string id, CancellationToken cancellationToken);
    Task<RecipeDto> CreateRecipeAsync(RecipeDto recipe, string userId, string userEmail, CancellationToken cancellationToken);
    Task<RecipeUpdateResult> UpdateRecipeAsync(RecipeDto recipe, CancellationToken cancellationToken);
    Task<bool> DeleteRecipeAsync(string id, CancellationToken cancellationToken);

    Task<IReadOnlyList<UserSummaryDto>> GetUsersAsync(CancellationToken cancellationToken);
    Task<UserLoginInfo?> GetUserByEmailAsync(string email, CancellationToken cancellationToken);
    Task<(string Status, string? Id)> CreateUserAsync(string email, string passwordHash, string role, CancellationToken cancellationToken);
    Task<string> UpdateUserAsync(string id, string email, string role, bool isActive, CancellationToken cancellationToken);
    Task<string> SetUserPasswordAsync(string id, string passwordHash, CancellationToken cancellationToken);
    Task<bool> DeleteUserAsync(string id, CancellationToken cancellationToken);
}

public sealed record ItemUpdateResult(string Status, ItemDto? Item, ItemDto? Current)
{
    public static ItemUpdateResult Updated(ItemDto item) => new("ok", item, null);
    public static ItemUpdateResult NotFound() => new("not_found", null, null);
    public static ItemUpdateResult Conflict(ItemDto current) => new("version_conflict", null, current);
}

public sealed record RecipeUpdateResult(string Status, RecipeDto? Recipe, RecipeDto? Current)
{
    public static RecipeUpdateResult Updated(RecipeDto recipe) => new("ok", recipe, null);
    public static RecipeUpdateResult NotFound() => new("not_found", null, null);
    public static RecipeUpdateResult Conflict(RecipeDto current) => new("version_conflict", null, current);
}
