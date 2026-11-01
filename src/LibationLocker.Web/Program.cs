using LibationLocker.Web.Api;
using LibationLocker.Web.Data;
using LibationLocker.Web.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDataProtection();
builder.Services.AddRazorPages();
builder.Services.AddHttpClient();
builder.Services.AddHttpClient("ai", client =>
{
    client.Timeout = Timeout.InfiniteTimeSpan;
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ILibationLockerRepository, SqlLibationLockerRepository>();
builder.Services.AddSingleton<AiJobService>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();
app.UseMiddleware<CookieAuthMiddleware>();

app.MapRazorPages();
app.MapLibationLockerApi();

app.MapGet("/logout", (HttpContext ctx) =>
{
    ctx.Response.Cookies.Delete("ll-auth");
    return Results.Redirect("/Login");
});

app.Run();
