namespace CricketApp.Api.Models;

public class UserLoginHistory
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Username { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public DateTime LoginTime { get; set; } = DateTime.UtcNow;
    public DateTime? LogoutTime { get; set; }
    public string Status { get; set; } = "Active"; // Active, Logout, Expired
    public string? IPAddress { get; set; }
    public string? HostName { get; set; }
    public string? LogoutReason { get; set; } // UserLogout, AdminForceLogout, SessionExpired, AccountDeactivated
    public int? LogoutByUserId { get; set; }
    public User? LogoutByUser { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
