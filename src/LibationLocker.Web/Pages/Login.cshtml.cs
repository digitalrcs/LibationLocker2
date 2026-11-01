using LibationLocker.Web.Data;
using LibationLocker.Web.Services;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace LibationLocker.Web.Pages;

public sealed class LoginModel(ILibationLockerRepository repo, IDataProtectionProvider dp, IConfiguration configuration) : PageModel
{
    private readonly IDataProtector _protector = dp.CreateProtector("LibationLocker.Auth.v2");

    [BindProperty] public string Email    { get; set; } = "";
    [BindProperty] public string Password { get; set; } = "";

    public string? Error { get; private set; }

    public IActionResult OnGet([FromQuery] string? returnUrl = null) => Page();

    public async Task<IActionResult> OnPostAsync([FromQuery] string? returnUrl = null)
    {
        var target = returnUrl is { Length: > 0 } r && Url.IsLocalUrl(r) ? r : "/";

        // Optional first-run administrator supplied by environment or private configuration.
        var config = await repo.GetConfigAsync(HttpContext.RequestAborted);
        var bootstrapEnabled = configuration.GetValue<bool>("LibationLocker:BootstrapAdmin:Enabled");
        var bootstrapEmail = configuration["LibationLocker:BootstrapAdmin:Email"]?.Trim() ?? "";
        var bootstrapPassword = configuration["LibationLocker:BootstrapAdmin:Password"] ?? "";
        if (config.Auth.AllowDefaultAdmin
            && bootstrapEnabled
            && bootstrapEmail.Length > 0
            && bootstrapPassword.Length > 0
            && string.Equals(Email.Trim(), bootstrapEmail, StringComparison.OrdinalIgnoreCase)
            && UserAuthService.FixedTimeEquals(Password, bootstrapPassword))
        {
            CookieAuthMiddleware.SetAuthCookie(HttpContext, _protector, "builtin-admin", "admin", bootstrapEmail);
            return Redirect(target);
        }

        // Database user lookup
        var user = await repo.GetUserByEmailAsync(Email.Trim(), HttpContext.RequestAborted);
        if (user is { IsActive: true } && UserAuthService.VerifyPassword(Password, user.PasswordHash))
        {
            CookieAuthMiddleware.SetAuthCookie(HttpContext, _protector, user.Id, user.Role, user.Email);
            return Redirect(target);
        }

        Error = "Invalid email or password.";
        return Page();
    }
}
