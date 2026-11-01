using System.Globalization;
using System.Text;
using LibationLocker.Web.Data;
using LibationLocker.Web.Models;
using LibationLocker.Web.Services;

namespace LibationLocker.Web.Api;

public static class ApiEndpoints
{
    public static void MapLibationLockerApi(this WebApplication app)
    {
        var api = app.MapGroup("/api");

        api.MapGet("/health", () => Results.Json(new { ok = true }));

        // ── Current user ──────────────────────────────────────────────────────
        api.MapGet("/me", (HttpContext ctx) => Results.Json(new
        {
            userId = ctx.Items["ll:userid"] as string,
            email = ctx.Items["ll:email"] as string,
            role = ctx.Items["ll:role"] as string,
            isAdmin = IsAdmin(ctx),
            isBuiltinAdmin = ctx.Items["ll:userid"] as string == "builtin-admin"
        }));

        // ── Items ─────────────────────────────────────────────────────────────
        api.MapGet("/items", async (ILibationLockerRepository repo, CancellationToken ct) =>
            Results.Json(await repo.GetItemsAsync(ct)));

        api.MapPost("/item", async (ItemDto item, ILibationLockerRepository repo, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(item.Type) || string.IsNullOrWhiteSpace(item.Brand) || string.IsNullOrWhiteSpace(item.Name))
                return Results.BadRequest(new { error = "missing_required_fields" });
            return Results.Json(await repo.CreateItemAsync(item, ct));
        });

        api.MapPut("/item", async (ItemDto item, ILibationLockerRepository repo, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(item.Id))
                return Results.BadRequest(new { error = "missing_id" });
            var result = await repo.UpdateItemAsync(item, ct);
            return result.Status switch
            {
                "ok" => Results.Json(result.Item),
                "version_conflict" => Results.Conflict(new { error = "version_conflict", current = result.Current }),
                _ => Results.NotFound(new { error = "not_found" })
            };
        });

        api.MapDelete("/item", async (string id, ILibationLockerRepository repo, CancellationToken ct) =>
            await repo.DeleteItemAsync(id, ct) ? Results.Json(new { ok = true }) : Results.NotFound(new { error = "not_found" }));

        api.MapGet("/item-history", async (int? days, string? itemId, ILibationLockerRepository repo, CancellationToken ct) =>
            Results.Json(await repo.GetItemHistoryAsync(Math.Clamp(days ?? 90, 1, 3650), itemId, ct)));

        // ── Config (read for all users; write admin only) ──────────────────────
        api.MapGet("/config", async (ILibationLockerRepository repo, CancellationToken ct) =>
            Results.Json(await repo.GetConfigAsync(ct)));

        api.MapPut("/config", async (HttpContext ctx, DropdownConfigDto config, ILibationLockerRepository repo, CancellationToken ct) =>
        {
            if (!IsAdmin(ctx)) return Forbidden();
            await repo.SaveConfigAsync(config, ct);
            return Results.Json(new { ok = true });
        });

        // ── Storage ───────────────────────────────────────────────────────────
        api.MapGet("/storage", async (ILibationLockerRepository repo, CancellationToken ct) =>
        {
            var count = (await repo.GetItemsAsync(ct)).Count;
            return Results.Json(new
            {
                backend = "SQL Server",
                itemCount = count,
                fsMounted = true,
                avgBytesPerItem = 0,
                estItemsLeft = int.MaxValue,
                lastError = ""
            });
        });

        // ── Export (shopping list available to all; json/csv admin only) ──────
        api.MapGet("/export", async (string? format, string? filter, HttpContext ctx, ILibationLockerRepository repo, CancellationToken ct) =>
        {
            format = string.IsNullOrWhiteSpace(format) ? "json" : format.ToLowerInvariant();
            var isShoppingList = format == "txt" && IsNeedFilter(filter);

            if (!isShoppingList && !IsAdmin(ctx))
                return Forbidden();

            var items = (await repo.GetItemsAsync(ct)).Where(i => !IsNeedFilter(filter) || i.NeedToBuy).ToArray();

            if (format == "csv")
                return Results.File(Encoding.UTF8.GetBytes(ToCsv(items)), "text/csv", "libation-locker-items.csv");

            if (format == "txt")
                return Results.File(Encoding.UTF8.GetBytes(ToText(items)), "text/plain", "libation-locker-shopping-list.txt");

            var bundle = new ExportBundleDto { Config = await repo.GetConfigAsync(ct), Items = items };
            return Results.Json(bundle);
        });

        // ── Import (admin only) ───────────────────────────────────────────────
        api.MapPost("/import", async (HttpRequest request, HttpContext ctx, ILibationLockerRepository repo, CancellationToken ct) =>
        {
            if (!IsAdmin(ctx)) return Forbidden();
            var mode = request.Query["mode"].FirstOrDefault() ?? "merge";
            var dryRun = IsTruthy(request.Query["dryrun"].FirstOrDefault());
            var bundle = await request.ReadFromJsonAsync<ExportBundleDto>(cancellationToken: ct);
            if (bundle is null) return Results.BadRequest(new { error = "invalid_json" });
            return Results.Json(await repo.ImportAsync(bundle, mode, dryRun, ct));
        });

        // ── AI ────────────────────────────────────────────────────────────────
        api.MapGet("/ai/status", (AiJobService ai) => Results.Json(ai.GetStatus()));

        api.MapGet("/ai/availability", async (ILibationLockerRepository repo, AiJobService ai, CancellationToken ct) =>
        {
            var config = await repo.GetConfigAsync(ct);
            return Results.Json(await ai.CheckAvailabilityAsync(config.Ai, ct));
        });

        api.MapGet("/ai/models", async (HttpContext ctx, ILibationLockerRepository repo, AiJobService ai, CancellationToken ct) =>
        {
            if (!IsAdmin(ctx)) return Forbidden();
            try
            {
                var config = await repo.GetConfigAsync(ct);
                return Results.Json(new { ok = true, models = await ai.ListModelsAsync(config.Ai, ct) });
            }
            catch (Exception ex)
            {
                return Results.Json(new { ok = false, error = ex.Message, models = Array.Empty<string>() });
            }
        });

        api.MapPost("/ai/test", (AiJobService ai, CancellationToken ct) =>
        {
            var result = ai.StartTest(ct);
            return result.Started
                ? Results.Accepted("/api/ai/status", new { ok = true, started = true, result.Token })
                : Results.Conflict(new { ok = false, error = "An AI request is already running.", result.Token });
        });

        api.MapPost("/ai/ask", (AiAskRequest request, AiJobService ai, CancellationToken ct) =>
        {
            try
            {
                var result = ai.StartAsk(request, ct);
                return result.Started
                    ? Results.Accepted("/api/ai/status", new { ok = true, started = true, result.Token })
                    : Results.Conflict(new { ok = false, error = "An AI request is already running.", result.Token });
            }
            catch (ArgumentException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        // ── Recipes ───────────────────────────────────────────────────────────
        api.MapGet("/recipes", async (ILibationLockerRepository repo, CancellationToken ct) =>
            Results.Json(await repo.GetRecipesAsync(ct)));

        api.MapPost("/recipe", async (RecipeDto recipe, HttpContext ctx, ILibationLockerRepository repo, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(recipe.Name))
                return Results.BadRequest(new { error = "missing_required_fields" });
            var userId    = ctx.Items["ll:userid"] as string ?? "";
            var userEmail = ctx.Items["ll:email"]  as string ?? "";
            return Results.Json(await repo.CreateRecipeAsync(recipe, userId, userEmail, ct));
        });

        api.MapPut("/recipe", async (RecipeDto recipe, ILibationLockerRepository repo, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(recipe.Id))
                return Results.BadRequest(new { error = "missing_id" });
            var result = await repo.UpdateRecipeAsync(recipe, ct);
            return result.Status switch
            {
                "ok"               => Results.Json(result.Recipe),
                "version_conflict" => Results.Conflict(new { error = "version_conflict", current = result.Current }),
                _                  => Results.NotFound(new { error = "not_found" })
            };
        });

        api.MapDelete("/recipe", async (string id, ILibationLockerRepository repo, CancellationToken ct) =>
            await repo.DeleteRecipeAsync(id, ct) ? Results.Json(new { ok = true }) : Results.NotFound(new { error = "not_found" }));

        // ── User management (admin only) ──────────────────────────────────────
        api.MapGet("/users", async (HttpContext ctx, ILibationLockerRepository repo, CancellationToken ct) =>
        {
            if (!IsAdmin(ctx)) return Forbidden();
            return Results.Json(await repo.GetUsersAsync(ct));
        });

        api.MapPost("/users", async (HttpContext ctx, UserCreateRequest req, ILibationLockerRepository repo, CancellationToken ct) =>
        {
            if (!IsAdmin(ctx)) return Forbidden();
            if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
                return Results.BadRequest(new { error = "Email and password are required." });
            if (req.Role != "admin" && req.Role != "user")
                return Results.BadRequest(new { error = "Role must be 'admin' or 'user'." });

            var hash = UserAuthService.HashPassword(req.Password);
            var (status, id) = await repo.CreateUserAsync(req.Email, hash, req.Role, ct);
            return status switch
            {
                "ok" => Results.Json(new { ok = true, id }),
                "duplicate_email" => Results.Conflict(new { error = "A user with that email already exists." }),
                _ => Results.StatusCode(500)
            };
        });

        api.MapPut("/users/{id}", async (string id, HttpContext ctx, UserUpdateRequest req, ILibationLockerRepository repo, CancellationToken ct) =>
        {
            if (!IsAdmin(ctx)) return Forbidden();
            if (string.IsNullOrWhiteSpace(req.Email))
                return Results.BadRequest(new { error = "Email is required." });
            if (req.Role != "admin" && req.Role != "user")
                return Results.BadRequest(new { error = "Role must be 'admin' or 'user'." });

            var status = await repo.UpdateUserAsync(id, req.Email, req.Role, req.IsActive, ct);
            return status switch
            {
                "ok" => Results.Json(new { ok = true }),
                "not_found" => Results.NotFound(new { error = "User not found." }),
                "duplicate_email" => Results.Conflict(new { error = "A user with that email already exists." }),
                _ => Results.StatusCode(500)
            };
        });

        api.MapPut("/users/{id}/password", async (string id, HttpContext ctx, SetPasswordRequest req, ILibationLockerRepository repo, CancellationToken ct) =>
        {
            if (!IsAdmin(ctx)) return Forbidden();
            if (string.IsNullOrWhiteSpace(req.Password))
                return Results.BadRequest(new { error = "Password is required." });

            var hash = UserAuthService.HashPassword(req.Password);
            var status = await repo.SetUserPasswordAsync(id, hash, ct);
            return status switch
            {
                "ok" => Results.Json(new { ok = true }),
                "not_found" => Results.NotFound(new { error = "User not found." }),
                _ => Results.StatusCode(500)
            };
        });

        api.MapDelete("/users/{id}", async (string id, HttpContext ctx, ILibationLockerRepository repo, CancellationToken ct) =>
        {
            if (!IsAdmin(ctx)) return Forbidden();
            if (id == (ctx.Items["ll:userid"] as string))
                return Results.BadRequest(new { error = "You cannot delete your own account." });
            return await repo.DeleteUserAsync(id, ct)
                ? Results.Json(new { ok = true })
                : Results.NotFound(new { error = "User not found." });
        });
    }

    private static bool IsAdmin(HttpContext ctx) =>
        ctx.Items["ll:role"] as string == "admin";

    private static IResult Forbidden() =>
        Results.Json(new { error = "Forbidden" }, statusCode: 403);

    private static bool IsNeedFilter(string? filter) =>
        filter is not null && (filter.Equals("need", StringComparison.OrdinalIgnoreCase)
            || filter.Equals("shopping", StringComparison.OrdinalIgnoreCase)
            || filter.Equals("needtobuy", StringComparison.OrdinalIgnoreCase));

    private static bool IsTruthy(string? value) =>
        value is not null && (value == "1" || value.Equals("true", StringComparison.OrdinalIgnoreCase)
            || value.Equals("yes", StringComparison.OrdinalIgnoreCase));

    private static string ToCsv(IEnumerable<ItemDto> items)
    {
        var sb = new StringBuilder("Type,Brand,Name,SizeMl,ABV,Qty,RemainingPct,NeedToBuy,Rating,Tags,Notes\r\n");
        foreach (var item in items)
        {
            sb.AppendJoin(',', Csv(item.Type), Csv(item.Brand), Csv(item.Name),
                item.SizeMl.ToString(CultureInfo.InvariantCulture),
                item.Abv?.ToString(CultureInfo.InvariantCulture) ?? "",
                item.Qty.ToString(CultureInfo.InvariantCulture),
                item.RemainingPct.ToString(CultureInfo.InvariantCulture),
                item.NeedToBuy ? "true" : "false",
                item.Rating.ToString(CultureInfo.InvariantCulture),
                Csv(string.Join(';', item.Tags)), Csv(item.Notes));
            sb.AppendLine();
        }
        return sb.ToString();
    }

    private static string ToText(IEnumerable<ItemDto> items)
    {
        var sb = new StringBuilder();
        foreach (var group in items.GroupBy(i => i.Type).OrderBy(g => g.Key))
        {
            sb.AppendLine(group.Key);
            foreach (var item in group.OrderBy(i => i.Brand).ThenBy(i => i.Name))
            {
                sb.Append(" - ").Append(item.Brand).Append(' ').Append(item.Name)
                  .Append(" (qty ").Append(item.Qty).Append(", ")
                  .Append(item.RemainingPct).Append("% remaining)").AppendLine();
            }
            sb.AppendLine();
        }
        return sb.ToString();
    }

    private static string Csv(string value) => $"\"{(value ?? "").Replace("\"", "\"\"")}\"";
}
