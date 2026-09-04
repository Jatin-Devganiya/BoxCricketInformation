using CricketApp.Api.Data;
using CricketApp.Api.DTOs;
using CricketApp.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly CricketDbContext _context;

    public UsersController(CricketDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .OrderBy(u => u.Username)
            .Select(u => new UserDto
            {
                Id = u.Id,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Username = u.Username,
                Status = u.Status,
                Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList(),
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUserById(int id)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null) return NotFound(new { message = "User not found." });

        return Ok(new UserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Username = user.Username,
            Status = user.Status,
            Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList(),
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

        return CreatedAtAction(nameof(GetUserById), new { id = user.Id }, new UserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Username = user.Username,
            Status = user.Status,
            Roles = new List<string> { role.Name },
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

        return Ok(new UserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Username = user.Username,
            Status = user.Status,
            Roles = role != null ? new List<string> { role.Name } : new List<string>(),
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

        return Ok(new { message = "User marked as inactive." });
    }
}
