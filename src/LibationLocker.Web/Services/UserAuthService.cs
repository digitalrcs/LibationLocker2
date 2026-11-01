using System.Security.Cryptography;
using System.Text;

namespace LibationLocker.Web.Services;

public static class UserAuthService
{
    private const int Iterations = 310_000;
    private const int SaltSize   = 16;
    private const int HashSize   = 32;

    public static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA512, HashSize);
        return $"v1:{Iterations}:{Convert.ToBase64String(salt)}:{Convert.ToBase64String(hash)}";
    }

    public static bool VerifyPassword(string password, string storedHash)
    {
        var parts = storedHash.Split(':');
        if (parts.Length != 4 || parts[0] != "v1") return false;
        if (!int.TryParse(parts[1], out var iterations) || iterations < 1) return false;
        try
        {
            var salt     = Convert.FromBase64String(parts[2]);
            var expected = Convert.FromBase64String(parts[3]);
            var actual   = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA512, expected.Length);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch { return false; }
    }

    public static bool FixedTimeEquals(string supplied, string configured)
    {
        var suppliedBytes = Encoding.UTF8.GetBytes(supplied ?? "");
        var configuredBytes = Encoding.UTF8.GetBytes(configured ?? "");
        return suppliedBytes.Length == configuredBytes.Length
            && CryptographicOperations.FixedTimeEquals(suppliedBytes, configuredBytes);
    }
}
