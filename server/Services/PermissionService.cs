using CricketApp.Api.Data;
using CricketApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Services;

public interface IPermissionService
{
    Dictionary<string, bool> GetRoleDefaults(string role);
    Task<Dictionary<string, bool>> GetEffectivePermissionsAsync(int userId);
    Task<bool> HasPermissionAsync(int userId, string permission);
    Task<Dictionary<string, string>> GetUserOverridesAsync(int userId);
    Task SetUserOverridesAsync(int userId, IDictionary<string, string>? overrides);
}

public class PermissionService : IPermissionService
{
    private readonly CricketDbContext _context;

    public static readonly string[] AllPermissions = new[]
    {
        "Matches",
        "LiveScoring",
        "UserManagement",
        "Players",
        "Teams",
        "Series"
    };

    public PermissionService(CricketDbContext context)
    {
        _context = context;
    }

    public Dictionary<string, bool> GetRoleDefaults(string role)
    {
        var defaults = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);

        if (string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            foreach (var perm in AllPermissions)
            {
                defaults[perm] = true;
            }
        }
        else if (string.Equals(role, "Umpire", StringComparison.OrdinalIgnoreCase))
        {
            defaults["Matches"] = true;
            defaults["LiveScoring"] = true;
            defaults["UserManagement"] = false;
            defaults["Players"] = true;
            defaults["Teams"] = true;
            defaults["Series"] = true;
        }
        else // User or default
        {
            foreach (var perm in AllPermissions)
            {
                defaults[perm] = false;
            }
        }

        return defaults;
    }

    public async Task<Dictionary<string, bool>> GetEffectivePermissionsAsync(int userId)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.PermissionOverrides)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            return GetRoleDefaults("User");
        }

        var primaryRole = user.UserRoles.FirstOrDefault()?.Role.Name ?? "User";
        var effective = GetRoleDefaults(primaryRole);

        // Apply user overrides (user override takes precedence over role default)
        foreach (var ov in user.PermissionOverrides)
        {
            effective[ov.Permission] = ov.IsAllowed;
        }

        return effective;
    }

    public async Task<bool> HasPermissionAsync(int userId, string permission)
    {
        var effective = await GetEffectivePermissionsAsync(userId);
        return effective.TryGetValue(permission, out var isAllowed) && isAllowed;
    }

    public async Task<Dictionary<string, string>> GetUserOverridesAsync(int userId)
    {
        var overrides = await _context.UserPermissionOverrides
            .Where(upo => upo.UserId == userId)
            .ToDictionaryAsync(
                upo => upo.Permission,
                upo => upo.IsAllowed ? "Allow" : "Deny",
                StringComparer.OrdinalIgnoreCase
            );

        return overrides;
    }

    public async Task SetUserOverridesAsync(int userId, IDictionary<string, string>? overrides)
    {
        if (overrides == null) return;

        var existing = await _context.UserPermissionOverrides
            .Where(upo => upo.UserId == userId)
            .ToListAsync();

        foreach (var kvp in overrides)
        {
            var perm = kvp.Key.Trim();
            var access = kvp.Value?.Trim();

            var current = existing.FirstOrDefault(e => string.Equals(e.Permission, perm, StringComparison.OrdinalIgnoreCase));

            if (string.Equals(access, "Inherit", StringComparison.OrdinalIgnoreCase) || string.IsNullOrEmpty(access))
            {
                if (current != null)
                {
                    _context.UserPermissionOverrides.Remove(current);
                }
            }
            else if (string.Equals(access, "Allow", StringComparison.OrdinalIgnoreCase))
            {
                if (current != null)
                {
                    current.IsAllowed = true;
                }
                else
                {
                    await _context.UserPermissionOverrides.AddAsync(new UserPermissionOverride
                    {
                        UserId = userId,
                        Permission = perm,
                        IsAllowed = true
                    });
                }
            }
            else if (string.Equals(access, "Deny", StringComparison.OrdinalIgnoreCase))
            {
                if (current != null)
                {
                    current.IsAllowed = false;
                }
                else
                {
                    await _context.UserPermissionOverrides.AddAsync(new UserPermissionOverride
                    {
                        UserId = userId,
                        Permission = perm,
                        IsAllowed = false
                    });
                }
            }
        }

        await _context.SaveChangesAsync();
    }
}
