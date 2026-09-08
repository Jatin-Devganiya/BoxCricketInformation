using CricketApp.Api.Data;
using CricketApp.Api.DTOs;
using CricketApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Services;

public interface ISessionService
{
    Task<(bool HasActiveSession, string? ExistingSessionId, DateTime? LoginTime)> CheckActiveSessionAsync(int userId);
    Task<UserLoginHistory> CreateSessionAsync(int userId, string username, string sessionId, string? ipAddress, string? hostName);
    Task<bool> EndSessionAsync(string sessionId, string reason = "UserLogout", int? logoutByUserId = null);
    Task<int> EndAllUserSessionsAsync(int userId, string reason = "AdminForceLogout", int? logoutByUserId = null);
    Task<bool> IsSessionActiveAsync(int userId, string sessionId);
    Task<List<ActiveSessionDto>> GetActiveSessionsAsync();
    Task<PagedResult<LoginHistoryDto>> GetLoginHistoryAsync(LoginHistoryFilterRequest filter);
}

public class SessionService : ISessionService
{
    private readonly CricketDbContext _context;
    private readonly IConfiguration _configuration;

    public SessionService(CricketDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    private int GetSessionTimeoutMinutes()
    {
        return int.TryParse(_configuration["Jwt:DurationInMinutes"], out var dur) ? dur : 1440;
    }

    public async Task<(bool HasActiveSession, string? ExistingSessionId, DateTime? LoginTime)> CheckActiveSessionAsync(int userId)
    {
        var timeoutMinutes = GetSessionTimeoutMinutes();
        var cutoff = DateTime.UtcNow.AddMinutes(-timeoutMinutes);

        // Fetch any sessions that are marked Active
        var activeSessions = await _context.UserLoginHistories
            .Where(h => h.UserId == userId && h.Status == "Active" && h.LogoutTime == null)
            .OrderByDescending(h => h.LoginTime)
            .ToListAsync();

        bool hasValidActiveSession = false;
        string? activeSessionId = null;
        DateTime? loginTime = null;

        foreach (var s in activeSessions)
        {
            // If the session exceeded token lifetime, mark as Expired automatically
            if (s.LoginTime < cutoff)
            {
                s.Status = "Expired";
                s.LogoutTime = s.LoginTime.AddMinutes(timeoutMinutes);
                s.LogoutReason = "SessionExpired";
                s.UpdatedAt = DateTime.UtcNow;
            }
            else if (!hasValidActiveSession)
            {
                hasValidActiveSession = true;
                activeSessionId = s.SessionId;
                loginTime = s.LoginTime;
            }
        }

        if (_context.ChangeTracker.HasChanges())
        {
            await _context.SaveChangesAsync();
        }

        return (hasValidActiveSession, activeSessionId, loginTime);
    }

    public async Task<UserLoginHistory> CreateSessionAsync(int userId, string username, string sessionId, string? ipAddress, string? hostName)
    {
        var record = new UserLoginHistory
        {
            UserId = userId,
            Username = username,
            SessionId = sessionId,
            LoginTime = DateTime.UtcNow,
            LogoutTime = null,
            Status = "Active",
            IPAddress = ipAddress,
            HostName = hostName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.UserLoginHistories.AddAsync(record);
        await _context.SaveChangesAsync();
        return record;
    }

    public async Task<bool> EndSessionAsync(string sessionId, string reason = "UserLogout", int? logoutByUserId = null)
    {
        var session = await _context.UserLoginHistories
            .FirstOrDefaultAsync(h => h.SessionId == sessionId && h.Status == "Active");

        if (session == null) return false;

        session.Status = "Logout";
        session.LogoutTime = DateTime.UtcNow;
        session.LogoutReason = reason;
        session.LogoutByUserId = logoutByUserId;
        session.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> EndAllUserSessionsAsync(int userId, string reason = "AdminForceLogout", int? logoutByUserId = null)
    {
        var sessions = await _context.UserLoginHistories
            .Where(h => h.UserId == userId && h.Status == "Active")
            .ToListAsync();

        if (sessions.Count == 0) return 0;

        var now = DateTime.UtcNow;
        foreach (var s in sessions)
        {
            s.Status = "Logout";
            s.LogoutTime = now;
            s.LogoutReason = reason;
            s.LogoutByUserId = logoutByUserId;
            s.UpdatedAt = now;
        }

        await _context.SaveChangesAsync();
        return sessions.Count;
    }

    public async Task<bool> IsSessionActiveAsync(int userId, string sessionId)
    {
        var timeoutMinutes = GetSessionTimeoutMinutes();
        var cutoff = DateTime.UtcNow.AddMinutes(-timeoutMinutes);

        var session = await _context.UserLoginHistories
            .Include(h => h.User)
            .FirstOrDefaultAsync(h => h.UserId == userId && h.SessionId == sessionId);

        if (session == null) return false;

        // Invalidate if user was deactivated or session logged out
        if (session.Status != "Active" || session.LogoutTime != null || session.User.Status != "Active")
        {
            return false;
        }

        // Invalidate if session exceeded expiration lifetime
        if (session.LoginTime < cutoff)
        {
            session.Status = "Expired";
            session.LogoutTime = session.LoginTime.AddMinutes(timeoutMinutes);
            session.LogoutReason = "SessionExpired";
            session.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return false;
        }

        return true;
    }

    public async Task<List<ActiveSessionDto>> GetActiveSessionsAsync()
    {
        var timeoutMinutes = GetSessionTimeoutMinutes();
        var cutoff = DateTime.UtcNow.AddMinutes(-timeoutMinutes);

        var sessions = await _context.UserLoginHistories
            .Include(h => h.User)
                .ThenInclude(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
            .Where(h => h.Status == "Active" && h.LogoutTime == null && h.LoginTime >= cutoff && h.User.Status == "Active")
            .OrderByDescending(h => h.LoginTime)
            .ToListAsync();

        return sessions.Select(s => new ActiveSessionDto
        {
            Id = s.Id,
            UserId = s.UserId,
            Username = s.Username,
            SessionId = s.SessionId,
            Roles = s.User.UserRoles.Select(ur => ur.Role.Name).ToList(),
            LoginTime = s.LoginTime,
            Status = "Active",
            IPAddress = s.IPAddress,
            HostName = s.HostName
        }).ToList();
    }

    public async Task<PagedResult<LoginHistoryDto>> GetLoginHistoryAsync(LoginHistoryFilterRequest filter)
    {
        var query = _context.UserLoginHistories
            .Include(h => h.User)
                .ThenInclude(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
            .Include(h => h.LogoutByUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Username))
        {
            var u = filter.Username.Trim().ToLower();
            query = query.Where(h => h.Username.ToLower().Contains(u));
        }

        if (filter.UserId.HasValue && filter.UserId > 0)
        {
            query = query.Where(h => h.UserId == filter.UserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            var st = filter.Status.Trim().ToLower();
            query = query.Where(h => h.Status.ToLower() == st);
        }

        if (!string.IsNullOrWhiteSpace(filter.Role))
        {
            var r = filter.Role.Trim().ToLower();
            query = query.Where(h => h.User.UserRoles.Any(ur => ur.Role.Name.ToLower() == r));
        }

        if (!string.IsNullOrWhiteSpace(filter.IPAddress))
        {
            var ip = filter.IPAddress.Trim().ToLower();
            query = query.Where(h => h.IPAddress != null && h.IPAddress.ToLower().Contains(ip));
        }

        if (filter.FromDate.HasValue)
        {
            var f = filter.FromDate.Value.Date;
            query = query.Where(h => h.LoginTime >= f);
        }

        if (filter.ToDate.HasValue)
        {
            var t = filter.ToDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(h => h.LoginTime <= t);
        }

        if (filter.LogoutFromDate.HasValue)
        {
            var lf = filter.LogoutFromDate.Value.Date;
            query = query.Where(h => h.LogoutTime.HasValue && h.LogoutTime.Value >= lf);
        }

        if (filter.LogoutToDate.HasValue)
        {
            var lt = filter.LogoutToDate.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(h => h.LogoutTime.HasValue && h.LogoutTime.Value <= lt);
        }

        var totalCount = await query.CountAsync();

        var page = filter.Page <= 0 ? 1 : filter.Page;
        var pageSize = filter.PageSize <= 0 ? 10 : (filter.PageSize > 100 ? 100 : filter.PageSize);

        var items = await query
            .OrderByDescending(h => h.LoginTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(h => new LoginHistoryDto
            {
                Id = h.Id,
                UserId = h.UserId,
                Username = h.Username,
                SessionId = h.SessionId,
                Roles = h.User.UserRoles.Select(ur => ur.Role.Name).ToList(),
                LoginTime = h.LoginTime,
                LogoutTime = h.LogoutTime,
                Status = h.Status,
                IPAddress = h.IPAddress,
                HostName = h.HostName,
                LogoutReason = h.LogoutReason,
                LogoutByUserId = h.LogoutByUserId,
                LogoutByUsername = h.LogoutByUser != null ? h.LogoutByUser.Username : null
            })
            .ToListAsync();

        return new PagedResult<LoginHistoryDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }
}
