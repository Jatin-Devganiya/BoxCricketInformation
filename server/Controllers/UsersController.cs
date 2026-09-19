using CricketApp.Api.Attributes;
using CricketApp.Api.Data;
using CricketApp.Api.DTOs;
using CricketApp.Api.Models;
using CricketApp.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[RequirePermission("UserManagement")]
public class UsersController : ControllerBase
{
    private readonly CricketDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly ISessionService _sessionService;

    public UsersController(
        CricketDbContext context,
        IPermissionService permissionService,
        ISessionService sessionService)
    {
        _context = context;
        _permissionService = permissionService;
        _sessionService = sessionService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.PermissionOverrides)
            .OrderBy(u => u.Username)
            .ToListAsync();

        var result = new List<UserDto>();
        foreach (var u in users)
        {
            var primaryRole = u.UserRoles.FirstOrDefault()?.Role.Name ?? "User";
            var effective = _permissionService.GetRoleDefaults(primaryRole);
            var overridesDict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            foreach (var ov in u.PermissionOverrides)
            {
                effective[ov.Permission] = ov.IsAllowed;
                overridesDict[ov.Permission] = ov.IsAllowed ? "Allow" : "Deny";
            }

            result.Add(new UserDto
            {
                Id = u.Id,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Username = u.Username,
                Status = u.Status,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList(),
                Overrides = overridesDict,
                EffectivePermissions = effective,
                CreatedAt = u.CreatedAt
            });
        }

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(int id)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.PermissionOverrides)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null) return NotFound(new { message = "User not found." });

        var primaryRole = user.UserRoles.FirstOrDefault()?.Role.Name ?? "User";
        var effective = _permissionService.GetRoleDefaults(primaryRole);
        var overridesDict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var ov in user.PermissionOverrides)
        {
            effective[ov.Permission] = ov.IsAllowed;
            overridesDict[ov.Permission] = ov.IsAllowed ? "Allow" : "Deny";
        }

        return Ok(new UserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Username = user.Username,
            Status = user.Status,
            Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList(),
            Overrides = overridesDict,
            EffectivePermissions = effective,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
        {
            return BadRequest(new { message = "Username and password are required." });
        }

        bool exists = await _context.Users.AnyAsync(u => u.Username.ToLower() == req.Username.ToLower().Trim());
        if (exists)
        {
            return Conflict(new { message = $"Username '{req.Username}' is already taken." });
        }

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name.ToLower() == req.Role.ToLower().Trim());
        if (role == null)
        {
            return BadRequest(new { message = $"Role '{req.Role}' does not exist." });
        }

        var user = new User
        {
            FirstName = req.FirstName.Trim(),
            LastName = req.LastName.Trim(),
            Username = req.Username.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Status = string.IsNullOrWhiteSpace(req.Status) ? "Active" : req.Status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Users.AddAsync(user);
        await _context.SaveChangesAsync();

        await _context.UserRoles.AddAsync(new UserRole { UserId = user.Id, RoleId = role.Id });
        await _context.SaveChangesAsync();

        if (req.PermissionOverrides != null && req.PermissionOverrides.Count > 0)
        {
            await _permissionService.SetUserOverridesAsync(user.Id, req.PermissionOverrides);
        }

        var effective = await _permissionService.GetEffectivePermissionsAsync(user.Id);
        var overrides = await _permissionService.GetUserOverridesAsync(user.Id);

        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, new UserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Username = user.Username,
            Status = user.Status,
            Roles = new List<string> { role.Name },
            Overrides = overrides,
            EffectivePermissions = effective,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest req)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null) return NotFound(new { message = "User not found." });

        user.FirstName = req.FirstName.Trim();
        user.LastName = req.LastName.Trim();
        user.Status = req.Status;
        user.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(req.Password))
        {
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password);
        }

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Name.ToLower() == req.Role.ToLower().Trim());
        if (role != null)
        {
            _context.UserRoles.RemoveRange(user.UserRoles);
            await _context.UserRoles.AddAsync(new UserRole { UserId = user.Id, RoleId = role.Id });
        }

        await _context.SaveChangesAsync();

        if (req.PermissionOverrides != null)
        {
            await _permissionService.SetUserOverridesAsync(user.Id, req.PermissionOverrides);
        }

        var effective = await _permissionService.GetEffectivePermissionsAsync(user.Id);
        var overrides = await _permissionService.GetUserOverridesAsync(user.Id);

        if (string.Equals(user.Status, "Inactive", StringComparison.OrdinalIgnoreCase))
        {
            var adminUserIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            int? adminUserId = int.TryParse(adminUserIdClaim, out var aid) ? aid : null;
            await _sessionService.EndAllUserSessionsAsync(user.Id, "AccountDeactivated", adminUserId);
        }

        return Ok(new UserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Username = user.Username,
            Status = user.Status,
            Roles = role != null ? new List<string> { role.Name } : new List<string>(),
            Overrides = overrides,
            EffectivePermissions = effective,
            CreatedAt = user.CreatedAt
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound(new { message = "User not found." });

        if (user.Username.ToLower() == "admin")
        {
            return BadRequest(new { message = "Default system administrator cannot be deleted." });
        }

        // Soft-delete / deactivate to preserve historical audit
        user.Status = "Inactive";
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var adminUserIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        int? adminUserId = int.TryParse(adminUserIdClaim, out var aid) ? aid : null;
        await _sessionService.EndAllUserSessionsAsync(user.Id, "AccountDeactivated", adminUserId);

        return Ok(new { message = "User marked as inactive." });
    }
}
