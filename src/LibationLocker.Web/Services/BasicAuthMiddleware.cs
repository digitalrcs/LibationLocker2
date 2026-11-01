using LibationLocker.Web.Data;
using Microsoft.AspNetCore.DataProtection;

namespace LibationLocker.Web.Services;

// Cookie payload (encrypted): "{userId}|{role}|{email}"
// Bootstrap admin: userId = "builtin-admin", role = "admin", email comes from private configuration.
public sealed class CookieAuthMiddleware(RequestDelegate next, IDataProtectionProvider dp, IServiceProvider services, IConfiguration configuration)
{
    private readonly IDataProtector _protector = dp.CreateProtector("LibationLocker.Auth.v2");

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path;

        if (path.StartsWithSegments("/Login",  StringComparison.OrdinalIgnoreCase) ||
            path.StartsWithSegments("/logout", StringComparison.OrdinalIgnoreCase))
        {
            await next(context);
            return;
        }

        if (await TryAuthenticateAsync(context))
        {
            await next(context);
            return;
        }

        if (path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { error = "Unauthorized" });
            return;
        }

        var returnUrl = Uri.EscapeDataString(path.Value + context.Request.QueryString);
        context.Response.Redirect($"/Login?returnUrl={returnUrl}");
    }

    private async Task<bool> TryAuthenticateAsync(HttpContext context)
    {
        if (!context.Request.Cookies.TryGetValue("ll-auth", out var token) || string.IsNullOrEmpty(token))
            return false;

        string decrypted;
        try { decrypted = _protector.Unprotect(token); }
        catch { return false; }

        var parts = decrypted.Split('|');
        if (parts.Length != 3) return false;

        var userId = parts[0];
        var role   = parts[1];
        var email  = parts[2];

        if (userId == "builtin-admin")
        {
            await using var scope = services.CreateAsyncScope();
            var repo = scope.ServiceProvider.GetRequiredService<ILibationLockerRepository>();
            var cfg  = await repo.GetConfigAsync(default);
            var bootstrapEnabled = configuration.GetValue<bool>("LibationLocker:BootstrapAdmin:Enabled");
            var bootstrapEmail = configuration["LibationLocker:BootstrapAdmin:Email"];
            var bootstrapPassword = configuration["LibationLocker:BootstrapAdmin:Password"];
            if (!cfg.Auth.AllowDefaultAdmin
                || !bootstrapEnabled
                || string.IsNullOrWhiteSpace(bootstrapEmail)
                || string.IsNullOrEmpty(bootstrapPassword)) return false;
        }

        context.Items["ll:userid"] = userId;
        context.Items["ll:role"]   = role;
        context.Items["ll:email"]  = email;
        return true;
    }

    public static void SetAuthCookie(HttpContext context, IDataProtector protector, string userId, string role, string email)
    {
        var token = protector.Protect($"{userId}|{role}|{email}");
        context.Response.Cookies.Append("ll-auth", token, new CookieOptions
        {
            HttpOnly = true,
            Secure   = context.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires  = DateTimeOffset.UtcNow.AddDays(30)
        });
    }
}
