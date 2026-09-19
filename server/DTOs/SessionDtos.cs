namespace CricketApp.Api.DTOs;

public class ActiveSessionDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = new();
    public DateTime LoginTime { get; set; }
    public string Status { get; set; } = "Active"; // Active (Online)
    public string? IPAddress { get; set; }
    public string? HostName { get; set; }
}

public class LoginHistoryDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = new();
    public DateTime LoginTime { get; set; }
    public DateTime? LogoutTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? IPAddress { get; set; }
    public string? HostName { get; set; }
    public string? LogoutReason { get; set; }
    public int? LogoutByUserId { get; set; }
    public string? LogoutByUsername { get; set; }
}

public class LoginHistoryFilterRequest
{
    public string? Username { get; set; }
    public int? UserId { get; set; }
    public string? Role { get; set; }
    public string? Status { get; set; }
    public string? IPAddress { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public DateTime? LogoutFromDate { get; set; }
    public DateTime? LogoutToDate { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}

public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}

public class ForceLogoutRequest
{
    public int? UserId { get; set; }
    public string? SessionId { get; set; }
    public string? Reason { get; set; } = "AdminForceLogout";
}
