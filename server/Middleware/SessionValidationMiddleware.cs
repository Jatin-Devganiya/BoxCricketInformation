using System.Security.Claims;
using System.Text.Json;
using CricketApp.Api.Services;

namespace CricketApp.Api.Middleware;

public class SessionValidationMiddleware
{
    private readonly RequestDelegate _next;

    public SessionValidationMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ISessionService sessionService)
    {
        if (context.User?.Identity != null && context.User.Identity.IsAuthenticated)
        {
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var sessionIdClaim = context.User.FindFirst("SessionId")?.Value;

            if (int.TryParse(userIdClaim, out int userId) && !string.IsNullOrWhiteSpace(sessionIdClaim))
            {
                bool isActive = await sessionService.IsSessionActiveAsync(userId, sessionIdClaim);
                if (!isActive)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/json";
                    context.Response.Headers["X-Session-Terminated"] = "true";

                    var payload = new
                    {
                        message = "Your session has been terminated by an administrator.",
                        sessionTerminated = true
                    };

                    await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
                    return;
                }
            }
        }

        await _next(context);
    }
}
