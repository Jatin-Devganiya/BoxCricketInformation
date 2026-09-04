using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CricketApp.Api.Data;
using CricketApp.Api.DTOs;
using CricketApp.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace CricketApp.Api.Services;

public interface IAuthService
{
    Task<LoginResponse?> AuthenticateAsync(LoginRequest request);
    Task<UserProfileResponse?> GetCurrentUserAsync(int userId);
}

public class AuthService : IAuthService
{
    private readonly CricketDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(CricketDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<LoginResponse?> AuthenticateAsync(LoginRequest request)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower().Trim());

        if (user == null || user.Status != "Active")
        {
            return null;
        }

        bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        if (!isPasswordValid)
        {
            return null;
        }

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var tokenHandler = new JwtSecurityTokenHandler();
        var jwtKey = _configuration["Jwt:Key"] ?? "BoxCricketStatisticsManagementSecureKey_2026_SecretKey!";
        var key = Encoding.UTF8.GetBytes(jwtKey);
        var durationMinutes = int.TryParse(_configuration["Jwt:DurationInMinutes"], out var dur) ? dur : 1440;
        var expiresAt = DateTime.UtcNow.AddMinutes(durationMinutes);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new("FirstName", user.FirstName),
            new("LastName", user.LastName)
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAt,
            Issuer = _configuration["Jwt:Issuer"] ?? "CricketStatisticsApi",
            Audience = _configuration["Jwt:Audience"] ?? "CricketStatisticsClient",
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        var tokenString = tokenHandler.WriteToken(token);

        return new LoginResponse
        {
            Token = tokenString,
            ExpiresAt = expiresAt,
            User = new UserProfileResponse
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Username = user.Username,
                Status = user.Status,
                Roles = roles
            }
        };
    }

    public async Task<UserProfileResponse?> GetCurrentUserAsync(int userId)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return null;

        return new UserProfileResponse
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Username = user.Username,
            Status = user.Status,
            Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList()
        };
    }
}
