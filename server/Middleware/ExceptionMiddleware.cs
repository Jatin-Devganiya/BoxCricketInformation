using System.Net;
using System.Text.Json;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger, IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception occurred: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        // Intercept database unique constraint violations (2601 / 2627)
        if (exception is DbUpdateException dbUpdateEx &&
            dbUpdateEx.GetBaseException() is SqlException sqlEx &&
            (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            string userMessage = "A record with the same unique value already exists.";
            var msg = sqlEx.Message;

            if (msg.Contains("Players", StringComparison.OrdinalIgnoreCase))
            {
                userMessage = "Player with the same first name and last name already exists.";
            }
            else if (msg.Contains("Teams", StringComparison.OrdinalIgnoreCase))
            {
                userMessage = "Team name already exists.";
            }
            else if (msg.Contains("Series", StringComparison.OrdinalIgnoreCase))
            {
                userMessage = "Series name already exists.";
            }

            var uniqueErrorResponse = new
            {
                success = false,
                message = userMessage
            };

            return context.Response.WriteAsync(JsonSerializer.Serialize(uniqueErrorResponse));
        }

        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var response = new
        {
            success = false,
            message = "An error occurred while processing your request.",
            details = _env.IsDevelopment() ? exception.Message : null
        };

        var json = JsonSerializer.Serialize(response);
        return context.Response.WriteAsync(json);
    }
}
