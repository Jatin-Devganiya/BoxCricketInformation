using System.Net;
using System.Security.Claims;
using CricketApp.Api.Attributes;
using CricketApp.Api.DTOs;
using CricketApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CricketApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ISessionService _sessionService;

    public AuthController(IAuthService authService, ISessionService sessionService)
    {
        _authService = authService;
        _sessionService = sessionService;
    }

    private string GetClientIpAddress()
    {
        if (Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedHeader) && !string.IsNullOrWhiteSpace(forwardedHeader))
        {
            var firstIp = forwardedHeader.ToString().Split(',')[0].Trim();
            if (!string.IsNullOrWhiteSpace(firstIp)) return firstIp;
        }

        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
    }

    private string GetClientHostName()
    {
        var userAgent = Request.Headers.UserAgent.ToString();
        if (!string.IsNullOrWhiteSpace(userAgent))
        {
            // Simplify browser/client name for readability
            if (userAgent.Length > 150) userAgent = userAgent.Substring(0, 150);
            return userAgent;
        }

        try
        {
            return Dns.GetHostName();
        }
        catch
        {
            return "Web Client";
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Username and password are required." });
        }

        var ip = GetClientIpAddress();
        var host = GetClientHostName();

        var result = await _authService.AuthenticateAsync(request, ip, host);
        if (!result.Success)
        {
            if (result.IsAlreadyLoggedIn)
            {
                return Conflict(new { message = result.ErrorMessage ?? "This user is already logged in. Please log out from the existing session before logging in again." });
            }

            return Unauthorized(new { message = result.ErrorMessage ?? "Invalid username or password, or account is inactive." });
        }

        return Ok(result.Response);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var sessionId = User.FindFirst("SessionId")?.Value;

        if (int.TryParse(userIdClaim, out int userId) && !string.IsNullOrWhiteSpace(sessionId))
        {
            await _authService.LogoutAsync(userId, sessionId);
        }

        return Ok(new { message = "Logged out successfully." });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
        {
            return Unauthorized(new { message = "Invalid token claims." });
        }

        var profile = await _authService.GetCurrentUserAsync(userId);
        if (profile == null)
        {
            return NotFound(new { message = "User not found." });
        }

        return Ok(profile);
    }

    [Authorize]
    [RequirePermission("UserManagement")]
    [HttpGet("active-sessions")]
    public async Task<IActionResult> GetActiveSessions()
    {
        var sessions = await _sessionService.GetActiveSessionsAsync();
        return Ok(sessions);
    }

    [Authorize]
    [RequirePermission("UserManagement")]
    [HttpPost("force-logout/{sessionId}")]
    public async Task<IActionResult> ForceLogoutSession(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return BadRequest(new { message = "Session ID is required." });
        }

        var adminUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int? adminUserId = int.TryParse(adminUserIdClaim, out var id) ? id : null;

        bool success = await _sessionService.EndSessionAsync(sessionId, "AdminForceLogout", adminUserId);
        if (!success)
        {
            return NotFound(new { message = "Active session not found or already terminated." });
        }

        return Ok(new { message = "User session has been forcefully terminated." });
    }

    [Authorize]
    [RequirePermission("UserManagement")]
    [HttpPost("force-logout-user/{userId}")]
    public async Task<IActionResult> ForceLogoutUser(int userId)
    {
        var adminUserIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        int? adminUserId = int.TryParse(adminUserIdClaim, out var id) ? id : null;

        int terminatedCount = await _sessionService.EndAllUserSessionsAsync(userId, "AdminForceLogout", adminUserId);
        return Ok(new { message = $"Terminated {terminatedCount} active session(s) for user ID {userId}." });
    }

    [Authorize]
    [RequirePermission("UserManagement")]
    [HttpGet("login-history")]
    public async Task<IActionResult> GetLoginHistory([FromQuery] LoginHistoryFilterRequest filter)
    {
        var history = await _sessionService.GetLoginHistoryAsync(filter);
        return Ok(history);
    }
}
