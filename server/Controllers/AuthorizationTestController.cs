using System.Security.Claims;
using CricketApp.Api.Data;
using CricketApp.Api.DTOs;
using CricketApp.Api.Models;
using CricketApp.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Controllers;

public class AuthorizationTestCaseResult
{
    public int CaseNumber { get; set; }
    public string Scenario { get; set; } = string.Empty;
    public string Expected { get; set; } = string.Empty;
    public string Actual { get; set; } = string.Empty;
    public bool Passed { get; set; }
    public string? Details { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class AuthorizationTestController : ControllerBase
{
    private readonly CricketDbContext _context;
    private readonly IAuthService _authService;
    private readonly ISessionService _sessionService;
    private readonly IPlayerStatsService _playerStatsService;
    private readonly IStatusValidationService _statusValidationService;
    private readonly IScorecardService _scorecardService;
    private readonly ILiveScoringService _liveScoringService;

    public AuthorizationTestController(
        CricketDbContext context,
        IAuthService authService,
        ISessionService sessionService,
        IPlayerStatsService playerStatsService,
        IStatusValidationService statusValidationService,
        IScorecardService scorecardService,
        ILiveScoringService liveScoringService)
    {
        _context = context;
        _authService = authService;
        _sessionService = sessionService;
        _playerStatsService = playerStatsService;
        _statusValidationService = statusValidationService;
        _scorecardService = scorecardService;
        _liveScoringService = liveScoringService;
    }

    private static void SetUserContext(ControllerBase controller, int userId, string username, string role)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Name, username),
            new(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    [HttpGet("run-all")]
    public async Task<IActionResult> RunAllTests()
    {
        var results = new List<AuthorizationTestCaseResult>();
        int caseNum = 1;

        void AddResult(string scenario, string expected, string actual, bool passed, string? details = null)
        {
            results.Add(new AuthorizationTestCaseResult
            {
                CaseNumber = caseNum++,
                Scenario = scenario,
                Expected = expected,
                Actual = actual,
                Passed = passed,
                Details = details
            });
        }

        var prefix = "AuthTest_" + DateTime.UtcNow.Ticks.ToString().Substring(10);

        // Ensure test users exist
        var adminUser = await _context.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).FirstOrDefaultAsync(u => u.Username.ToLower() == "admin");
        var umpire1User = await _context.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).FirstOrDefaultAsync(u => u.Username.ToLower() == "umpire");
        var umpire2User = await _context.Users.Include(u => u.UserRoles).ThenInclude(ur => ur.Role).FirstOrDefaultAsync(u => u.Username.ToLower() == "umpire2");

        if (adminUser == null || umpire1User == null || umpire2User == null)
        {
            return BadRequest(new { message = "Prerequisite users (admin, umpire, umpire2) must exist in DB." });
        }

        // Teams for matches
        var team1 = await _context.Teams.FirstOrDefaultAsync(t => t.Status == "Active");
        var team2 = await _context.Teams.Where(t => t.Status == "Active" && t.Id != team1!.Id).FirstOrDefaultAsync();

        if (team1 == null || team2 == null)
        {
            return BadRequest(new { message = "At least 2 active teams are required in DB for testing." });
        }

        var playersCtrl = new PlayersController(_context, _playerStatsService);
        var seriesCtrl = new SeriesController(_context, _statusValidationService);
        var matchesCtrl = new MatchesController(_context, _scorecardService, _liveScoringService, _statusValidationService);

        // -------------------------------------------------------------
        // Test 1: Umpire1 creates Player1 -> Umpire1 can modify.
        // -------------------------------------------------------------
        SetUserContext(playersCtrl, umpire1User.Id, umpire1User.Username, "Umpire");
        var createPlayer1Res = await playersCtrl.CreatePlayer(new CreatePlayerRequest
        {
            FirstName = "TestP1",
            LastName = prefix,
            PlayerCategory = "Batsman",
            Status = "Active"
        });
        int player1Id = 0;
        if (createPlayer1Res is CreatedAtActionResult createdP1 && createdP1.Value is PlayerDto p1Dto)
        {
            player1Id = p1Dto.Id;
        }

        var updateP1Res = await playersCtrl.UpdatePlayer(player1Id, new UpdatePlayerRequest
        {
            FirstName = "TestP1Updated",
            LastName = prefix,
            PlayerCategory = "AllRounder",
            Status = "Active"
        });
        bool test1Passed = updateP1Res is OkObjectResult;
        AddResult("Umpire1 creates Player1 -> Umpire1 can modify", "200 OK", updateP1Res.GetType().Name, test1Passed);

        // -------------------------------------------------------------
        // Test 2: Umpire2 views Player1 -> allowed.
        // -------------------------------------------------------------
        SetUserContext(playersCtrl, umpire2User.Id, umpire2User.Username, "Umpire");
        var viewP1Res = await playersCtrl.GetPlayerById(player1Id);
        bool test2Passed = viewP1Res is OkObjectResult;
        AddResult("Umpire2 views Player1 -> allowed", "200 OK", viewP1Res.GetType().Name, test2Passed);

        // -------------------------------------------------------------
        // Test 3: Umpire2 modifies Player1 -> rejected (403).
        // -------------------------------------------------------------
        SetUserContext(playersCtrl, umpire2User.Id, umpire2User.Username, "Umpire");
        var updateP1ByU2Res = await playersCtrl.UpdatePlayer(player1Id, new UpdatePlayerRequest
        {
            FirstName = "HackedByU2",
            LastName = prefix,
            PlayerCategory = "Bowler",
            Status = "Active"
        });
        bool test3Passed = updateP1ByU2Res is ObjectResult obj3 && obj3.StatusCode == 403;
        AddResult("Umpire2 modifies Player1 -> rejected", "403 Forbidden",
            updateP1ByU2Res is ObjectResult o3 ? $"{o3.StatusCode}" : updateP1ByU2Res.GetType().Name, test3Passed);

        // -------------------------------------------------------------
        // Test 4: Umpire2 deletes Player1 -> rejected (403).
        // -------------------------------------------------------------
        SetUserContext(playersCtrl, umpire2User.Id, umpire2User.Username, "Umpire");
        var deleteP1ByU2Res = await playersCtrl.DeletePlayer(player1Id);
        bool test4Passed = deleteP1ByU2Res is ObjectResult obj4 && obj4.StatusCode == 403;
        AddResult("Umpire2 deletes Player1 -> rejected", "403 Forbidden",
            deleteP1ByU2Res is ObjectResult o4 ? $"{o4.StatusCode}" : deleteP1ByU2Res.GetType().Name, test4Passed);

        // -------------------------------------------------------------
        // Test 5: Umpire1 creates Series1 -> allowed.
        // -------------------------------------------------------------
        SetUserContext(seriesCtrl, umpire1User.Id, umpire1User.Username, "Umpire");
        var createSeriesRes = await seriesCtrl.CreateSeries(new CreateSeriesRequest
        {
            Name = "Series1_" + prefix,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(5),
            Status = "Scheduled",
            Description = "Series owned by Umpire1"
        });
        int series1Id = 0;
        if (createSeriesRes is CreatedAtActionResult createdS && createdS.Value is SeriesDto sDto)
        {
            series1Id = sDto.Id;
        }
        bool test5Passed = createSeriesRes is CreatedAtActionResult;
        AddResult("Umpire1 creates Series1 -> allowed", "201 Created", createSeriesRes.GetType().Name, test5Passed);

        // -------------------------------------------------------------
        // Test 6: Umpire1 creates Match1 under Series1 -> allowed.
        // -------------------------------------------------------------
        SetUserContext(matchesCtrl, umpire1User.Id, umpire1User.Username, "Umpire");
        var createMatchRes = await matchesCtrl.CreateMatch(new CreateMatchRequest
        {
            SeriesId = series1Id,
            Team1Id = team1.Id,
            Team2Id = team2.Id,
            ScheduledDate = DateTime.UtcNow.Date,
            ScheduledTime = "18:00",
            RequiredOvers = 6,
            Status = "Scheduled"
        });
        int match1Id = 0;
        if (createMatchRes is CreatedAtActionResult createdM && createdM.Value is MatchDto mDto)
        {
            match1Id = mDto.Id;
        }
        bool test6Passed = createMatchRes is CreatedAtActionResult;
        AddResult("Umpire1 creates Match1 under Series1 -> allowed", "201 Created", createMatchRes.GetType().Name, test6Passed);

        // -------------------------------------------------------------
        // Test 7: Umpire2 creates Match under Series1 -> rejected (403).
        // -------------------------------------------------------------
        SetUserContext(matchesCtrl, umpire2User.Id, umpire2User.Username, "Umpire");
        var createMatchByU2Res = await matchesCtrl.CreateMatch(new CreateMatchRequest
        {
            SeriesId = series1Id,
            Team1Id = team1.Id,
            Team2Id = team2.Id,
            ScheduledDate = DateTime.UtcNow.Date,
            ScheduledTime = "19:00",
            RequiredOvers = 6,
            Status = "Scheduled"
        });
        bool test7Passed = createMatchByU2Res is ObjectResult obj7 && obj7.StatusCode == 403;
        AddResult("Umpire2 creates Match under Series1 -> rejected", "403 Forbidden",
            createMatchByU2Res is ObjectResult o7 ? $"{o7.StatusCode}" : createMatchByU2Res.GetType().Name, test7Passed);

        // -------------------------------------------------------------
        // Test 8: Umpire1 live-scores Match1 -> allowed.
        // -------------------------------------------------------------
        SetUserContext(matchesCtrl, umpire1User.Id, umpire1User.Username, "Umpire");
        var startInningsRes = await matchesCtrl.StartInnings(match1Id, new StartInningsRequest
        {
            BattingTeamId = team1.Id,
            StrikerPlayerId = player1Id,
            NonStrikerPlayerId = player1Id,
            BowlerPlayerId = player1Id
        });
        // Can be OK or BadRequest (if player belongs/doesn't belong to team), but MUST NOT be 403 Forbidden!
        bool test8Passed = !(startInningsRes is ObjectResult o8 && o8.StatusCode == 403);
        AddResult("Umpire1 live-scores Match1 -> allowed", "Allowed (Not 403)",
            startInningsRes is ObjectResult o8Res ? $"{o8Res.StatusCode}" : startInningsRes.GetType().Name, test8Passed);

        // -------------------------------------------------------------
        // Test 9: Umpire2 live-scores Match1 -> rejected (403).
        // -------------------------------------------------------------
        SetUserContext(matchesCtrl, umpire2User.Id, umpire2User.Username, "Umpire");
        var liveScoreByU2Res = await matchesCtrl.StartInnings(match1Id, new StartInningsRequest
        {
            BattingTeamId = team1.Id,
            StrikerPlayerId = player1Id,
            NonStrikerPlayerId = player1Id,
            BowlerPlayerId = player1Id
        });
        bool test9Passed = liveScoreByU2Res is ObjectResult obj9 && obj9.StatusCode == 403;
        AddResult("Umpire2 live-scores Match1 -> rejected", "403 Forbidden",
            liveScoreByU2Res is ObjectResult o9 ? $"{o9.StatusCode}" : liveScoreByU2Res.GetType().Name, test9Passed);

        // -------------------------------------------------------------
        // Test 10: Umpire1 logs in -> successful.
        // -------------------------------------------------------------
        // Clear any leftover sessions for clean test
        await _sessionService.EndAllUserSessionsAsync(umpire1User.Id, "TestReset");
        var login1Res = await _authService.AuthenticateAsync(new LoginRequest { Username = "umpire", Password = "Umpire@123" }, "127.0.0.1", "BrowserTab1");
        bool test10Passed = login1Res.Success && !string.IsNullOrEmpty(login1Res.Response?.Token);
        AddResult("Umpire1 logs in -> successful", "Success=True", $"Success={login1Res.Success}", test10Passed);

        // -------------------------------------------------------------
        // Test 11: Umpire1 attempts second login -> rejected as already logged in.
        // -------------------------------------------------------------
        var login2Res = await _authService.AuthenticateAsync(new LoginRequest { Username = "umpire", Password = "Umpire@123" }, "192.168.1.50", "BrowserTab2");
        bool test11Passed = !login2Res.Success && login2Res.IsAlreadyLoggedIn;
        AddResult("Umpire1 attempts second login -> rejected", "IsAlreadyLoggedIn=True", $"IsAlreadyLoggedIn={login2Res.IsAlreadyLoggedIn}", test11Passed);

        // -------------------------------------------------------------
        // Test 12: Umpire1 logs out -> login allowed again.
        // -------------------------------------------------------------
        var (hasActive, sessId, _) = await _sessionService.CheckActiveSessionAsync(umpire1User.Id);
        if (hasActive && sessId != null)
        {
            await _sessionService.EndSessionAsync(sessId, "UserLogout", umpire1User.Id);
        }
        var loginAfterLogout = await _authService.AuthenticateAsync(new LoginRequest { Username = "umpire", Password = "Umpire@123" }, "127.0.0.1", "BrowserTab1");
        bool test12Passed = loginAfterLogout.Success;
        AddResult("Umpire1 logs out -> login allowed again", "Success=True", $"Success={loginAfterLogout.Success}", test12Passed);

        // -------------------------------------------------------------
        // Test 13: Admin force-logs out Umpire1 -> old session invalidated.
        // -------------------------------------------------------------
        var currentUmpireSession = await _context.UserLoginHistories.FirstOrDefaultAsync(h => h.UserId == umpire1User.Id && h.Status == "Active");
        string activeSessId = currentUmpireSession?.SessionId ?? "";
        await _sessionService.EndSessionAsync(activeSessId, "AdminForceLogout", adminUser.Id);
        bool sessionStillValid = await _sessionService.IsSessionActiveAsync(umpire1User.Id, activeSessId);
        bool test13Passed = !sessionStillValid;
        AddResult("Admin force-logs out Umpire1 -> old session invalidated", "IsSessionActive=False", $"IsSessionActive={sessionStillValid}", test13Passed);

        // -------------------------------------------------------------
        // Test 14: Umpire1 can log in again after Admin force logout.
        // -------------------------------------------------------------
        var loginAfterForceLogout = await _authService.AuthenticateAsync(new LoginRequest { Username = "umpire", Password = "Umpire@123" }, "127.0.0.1", "BrowserTab1");
        bool test14Passed = loginAfterForceLogout.Success;
        AddResult("Umpire1 can log in again after Admin force logout", "Success=True", $"Success={loginAfterForceLogout.Success}", test14Passed);

        // -------------------------------------------------------------
        // Test 15: Login history is recorded.
        // -------------------------------------------------------------
        var loginRecords = await _context.UserLoginHistories.Where(h => h.UserId == umpire1User.Id).ToListAsync();
        bool test15Passed = loginRecords.Any(h => h.LoginTime != default && !string.IsNullOrEmpty(h.SessionId));
        AddResult("Login history is recorded", "Records Found", $"Found {loginRecords.Count} records", test15Passed);

        // -------------------------------------------------------------
        // Test 16: Logout history is recorded.
        // -------------------------------------------------------------
        bool test16Passed = loginRecords.Any(h => h.LogoutTime.HasValue && h.Status == "Logout");
        AddResult("Logout history is recorded", "Logout Record Found", $"HasLogoutRecord={test16Passed}", test16Passed);

        // -------------------------------------------------------------
        // Test 17: Admin force logout is recorded with reason and admin ID.
        // -------------------------------------------------------------
        var forceLogoutRecord = loginRecords.FirstOrDefault(h => h.LogoutReason == "AdminForceLogout");
        bool test17Passed = forceLogoutRecord != null && forceLogoutRecord.LogoutByUserId == adminUser.Id;
        AddResult("Admin force logout is recorded", "LogoutReason=AdminForceLogout, LogoutByUserId=admin.Id",
            forceLogoutRecord != null ? $"Reason={forceLogoutRecord.LogoutReason}, By={forceLogoutRecord.LogoutByUserId}" : "Not Found", test17Passed);

        // -------------------------------------------------------------
        // Test 18: Expired sessions are handled correctly.
        // -------------------------------------------------------------
        // Create a simulated old session beyond 24h
        var expiredSessId = Guid.NewGuid().ToString("N");
        await _context.UserLoginHistories.AddAsync(new UserLoginHistory
        {
            UserId = umpire2User.Id,
            Username = umpire2User.Username,
            SessionId = expiredSessId,
            LoginTime = DateTime.UtcNow.AddDays(-2),
            Status = "Active",
            CreatedAt = DateTime.UtcNow.AddDays(-2),
            UpdatedAt = DateTime.UtcNow.AddDays(-2)
        });
        await _context.SaveChangesAsync();

        bool isExpiredValid = await _sessionService.IsSessionActiveAsync(umpire2User.Id, expiredSessId);
        var expiredRec = await _context.UserLoginHistories.FirstAsync(h => h.SessionId == expiredSessId);
        bool test18Passed = !isExpiredValid && (expiredRec.Status == "Expired" || expiredRec.LogoutReason == "SessionExpired");
        AddResult("Expired sessions handled correctly", "IsActive=False and Status=Expired",
            $"IsActive={isExpiredValid}, Status={expiredRec.Status}", test18Passed);

        // -------------------------------------------------------------
        // Test 19: Direct API calls cannot bypass ownership restrictions.
        // -------------------------------------------------------------
        // Umpire2 tries to delete Series1 directly
        SetUserContext(seriesCtrl, umpire2User.Id, umpire2User.Username, "Umpire");
        var deleteSeriesByU2 = await seriesCtrl.DeleteSeries(series1Id);
        bool test19Passed = deleteSeriesByU2 is ObjectResult obj19 && obj19.StatusCode == 403;
        AddResult("Direct API calls cannot bypass ownership", "403 Forbidden",
            deleteSeriesByU2 is ObjectResult o19 ? $"{o19.StatusCode}" : deleteSeriesByU2.GetType().Name, test19Passed);

        // -------------------------------------------------------------
        // Test 20: Admin retains access to all applicable resources.
        // -------------------------------------------------------------
        SetUserContext(seriesCtrl, adminUser.Id, adminUser.Username, "Admin");
        var adminUpdateSeries = await seriesCtrl.UpdateSeries(series1Id, new UpdateSeriesRequest
        {
            Name = "Series1_AdminUpdated_" + prefix,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(10),
            Status = "Scheduled"
        });
        SetUserContext(matchesCtrl, adminUser.Id, adminUser.Username, "Admin");
        var adminViewMatch = await matchesCtrl.GetMatchById(match1Id);

        bool test20Passed = adminUpdateSeries is OkObjectResult && adminViewMatch is OkObjectResult;
        AddResult("Admin retains access to all applicable resources", "200 OK across resources",
            $"SeriesUpdate={adminUpdateSeries.GetType().Name}, MatchGet={adminViewMatch.GetType().Name}", test20Passed);

        // Clean up test records
        await _sessionService.EndAllUserSessionsAsync(umpire1User.Id, "TestCleanup");

        int totalPassed = results.Count(r => r.Passed);
        return Ok(new
        {
            totalTests = results.Count,
            totalPassed = totalPassed,
            allPassed = totalPassed == results.Count,
            results = results
        });
    }
}
