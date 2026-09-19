using System.Security.Claims;
using CricketApp.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CricketApp.Api.Attributes;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true, Inherited = true)]
public class RequirePermissionAttribute : TypeFilterAttribute
{
    public RequirePermissionAttribute(string permission) : base(typeof(RequirePermissionFilter))
    {
        Arguments = new object[] { permission };
    }

    private class RequirePermissionFilter : IAsyncActionFilter
    {
        private readonly string _permission;
        private readonly IPermissionService _permissionService;

        public RequirePermissionFilter(string permission, IPermissionService permissionService)
        {
            _permission = permission;
            _permissionService = permissionService;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var user = context.HttpContext.User;
            if (user == null || user.Identity == null || !user.Identity.IsAuthenticated)
            {
                context.Result = new UnauthorizedObjectResult(new { message = "Authentication required." });
                return;
            }

            var userIdClaim = user.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId))
            {
                context.Result = new UnauthorizedObjectResult(new { message = "Invalid user identity claim." });
                return;
            }

            bool hasPermission = await _permissionService.HasPermissionAsync(userId, _permission);
            if (!hasPermission)
            {
                context.Result = new ObjectResult(new
                {
                    message = $"Access denied. '{_permission}' permission is required.",
                    permission = _permission,
                    error = "Forbidden"
                })
                {
                    StatusCode = StatusCodes.Status403Forbidden
                };
                return;
            }

            await next();
        }
    }
}
