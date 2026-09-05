using CricketApp.Api.Data;
using CricketApp.Api.DTOs;
using CricketApp.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Controllers;

public class UniqueValidationTestCaseResult
{
    public int CaseNumber { get; set; }
    public string Category { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public bool Passed { get; set; }
    public string Expected { get; set; } = string.Empty;
    public string Actual { get; set; } = string.Empty;
    public string? Message { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class UniqueValidationTestController : ControllerBase
{
    private readonly CricketDbContext _context;
    private readonly PlayersController _playersController;
    private readonly TeamsController _teamsController;
    private readonly SeriesController _seriesController;

    public UniqueValidationTestController(
        CricketDbContext context,
        CricketApp.Api.Services.IPlayerStatsService statsService,
        CricketApp.Api.Services.IStatusValidationService statusValidationService)
    {
        _context = context;
        _playersController = new PlayersController(context, statsService);
        _teamsController = new TeamsController(context);
        _seriesController = new SeriesController(context, statusValidationService);
    }

    [HttpGet("run-all")]
    public async Task<IActionResult> RunAllTests()
    {
        var results = new List<UniqueValidationTestCaseResult>();
        int caseNumber = 1;

        void AddResult(string category, string testName, bool passed, string expected, string actual, string? message)
        {
            results.Add(new UniqueValidationTestCaseResult
            {
                CaseNumber = caseNumber++,
                Category = category,
                TestName = testName,
                Passed = passed,
                Expected = expected,
                Actual = actual,
                Message = message
            });
        }

        // Generate unique test prefix using ticks to make test runs idempotent and isolated
        string pfx = "UTest_" + DateTime.UtcNow.Ticks.ToString().Substring(10) + "_";

        // ==========================================
        // 1. PLAYER TESTS
        // ==========================================
        string pFirst = pfx + "Dev";
        string pLast = "Ami";
        string pKumar = "Kumar";
        string pRahul = pfx + "Rahul";

        // 1. Add Dev Ami when no Dev Ami exists -> SUCCESS
        var p1Res = await _playersController.CreatePlayer(new CreatePlayerRequest
        {
            FirstName = pFirst,
            LastName = pLast,
            Status = "Active"
        });
        bool p1Success = p1Res is CreatedAtActionResult;
        int p1Id = p1Success ? ((PlayerDto)((CreatedAtActionResult)p1Res).Value!).Id : 0;
        AddResult("Player", "Add Dev Ami (new)", p1Success, "SUCCESS", p1Success ? "SUCCESS" : "FAILED", null);

        // 2. Add Dev Ami when Dev Ami already exists -> BLOCKED
        var p2Res = await _playersController.CreatePlayer(new CreatePlayerRequest
        {
            FirstName = pFirst,
            LastName = pLast,
            Status = "Active"
        });
        bool p2Blocked = p2Res is BadRequestObjectResult;
        string? p2Msg = null;
        if (p2Res is BadRequestObjectResult br2 && br2.Value != null)
        {
            var msgProp = br2.Value.GetType().GetProperty("message");
            p2Msg = msgProp?.GetValue(br2.Value)?.ToString();
        }
        AddResult("Player", "Add duplicate Dev Ami", p2Blocked && p2Msg == "Player with the same first name and last name already exists.", "BLOCKED", p2Blocked ? "BLOCKED" : "ALLOWED", p2Msg);

        // 3. Add Dev Kumar when Dev Ami exists -> SUCCESS
        var p3Res = await _playersController.CreatePlayer(new CreatePlayerRequest
        {
            FirstName = pFirst,
            LastName = pKumar,
            Status = "Active"
        });
        bool p3Success = p3Res is CreatedAtActionResult;
        AddResult("Player", "Add Dev Kumar (same first name, different last name)", p3Success, "SUCCESS", p3Success ? "SUCCESS" : "FAILED", null);

        // 4. Add Rahul Ami when Dev Ami exists -> SUCCESS
        var p4Res = await _playersController.CreatePlayer(new CreatePlayerRequest
        {
            FirstName = pRahul,
            LastName = pLast,
            Status = "Active"
        });
        bool p4Success = p4Res is CreatedAtActionResult;
        int p4Id = p4Success ? ((PlayerDto)((CreatedAtActionResult)p4Res).Value!).Id : 0;
        AddResult("Player", "Add Rahul Ami (different first name, same last name)", p4Success, "SUCCESS", p4Success ? "SUCCESS" : "FAILED", null);

        // 5. Update Dev Ami without changing name -> SUCCESS
        var p5Res = await _playersController.UpdatePlayer(p1Id, new UpdatePlayerRequest
        {
            FirstName = pFirst,
            LastName = pLast,
            PlayerCategory = "AllRounder",
            Status = "Active"
        });
        bool p5Success = p5Res is OkObjectResult;
        AddResult("Player", "Update Dev Ami without changing name (self-exemption)", p5Success, "SUCCESS", p5Success ? "SUCCESS" : "FAILED", null);

        // 6. Update Dev Ami -> Rahul Ami when Rahul Ami exists -> BLOCKED
        var p6Res = await _playersController.UpdatePlayer(p1Id, new UpdatePlayerRequest
        {
            FirstName = pRahul,
            LastName = pLast,
            Status = "Active"
        });
        bool p6Blocked = p6Res is BadRequestObjectResult;
        AddResult("Player", "Update Dev Ami -> existing Rahul Ami", p6Blocked, "BLOCKED", p6Blocked ? "BLOCKED" : "ALLOWED", null);

        // 7. Capitalization check: "dev ami" / "DEV AMI" -> BLOCKED
        var p7Res = await _playersController.CreatePlayer(new CreatePlayerRequest
        {
            FirstName = pFirst.ToLower(),
            LastName = pLast.ToUpper(),
            Status = "Active"
        });
        bool p7Blocked = p7Res is BadRequestObjectResult;
        AddResult("Player", "Case insensitivity check ('dev AMI')", p7Blocked, "BLOCKED", p7Blocked ? "BLOCKED" : "ALLOWED", null);

        // 8. Leading/trailing spaces check: " Dev " " Ami " -> BLOCKED
        var p8Res = await _playersController.CreatePlayer(new CreatePlayerRequest
        {
            FirstName = "  " + pFirst + "  ",
            LastName = "  " + pLast + "  ",
            Status = "Active"
        });
        bool p8Blocked = p8Res is BadRequestObjectResult;
        AddResult("Player", "Whitespace trimmed check (' Dev ' ' Ami ')", p8Blocked, "BLOCKED", p8Blocked ? "BLOCKED" : "ALLOWED", null);

        // ==========================================
        // 2. TEAM TESTS
        // ==========================================
        string t1Name = pfx + "Bharat's Team";
        string t2Name = pfx + "Rahul's Team";

        // 9. Add Bharat's Team (new) -> SUCCESS
        var t1Res = await _teamsController.CreateTeam(new CreateTeamRequest
        {
            Name = t1Name,
            ShortName = "BHT"
        });
        bool t1Success = t1Res is CreatedAtActionResult;
        int t1Id = t1Success ? ((TeamDto)((CreatedAtActionResult)t1Res).Value!).Id : 0;
        AddResult("Team", "Add Bharat's Team (new)", t1Success, "SUCCESS", t1Success ? "SUCCESS" : "FAILED", null);

        // 10. Add Bharat's Team again -> BLOCKED
        var t2Res = await _teamsController.CreateTeam(new CreateTeamRequest
        {
            Name = t1Name,
            ShortName = "BH2"
        });
        bool t2Blocked = t2Res is BadRequestObjectResult;
        string? t2Msg = null;
        if (t2Res is BadRequestObjectResult brT2 && brT2.Value != null)
        {
            var msgProp = brT2.Value.GetType().GetProperty("message");
            t2Msg = msgProp?.GetValue(brT2.Value)?.ToString();
        }
        AddResult("Team", "Add duplicate Bharat's Team", t2Blocked && t2Msg == "Team name already exists.", "BLOCKED", t2Blocked ? "BLOCKED" : "ALLOWED", t2Msg);

        // 11. Add Rahul's Team (new) -> SUCCESS
        var t3Res = await _teamsController.CreateTeam(new CreateTeamRequest
        {
            Name = t2Name,
            ShortName = "RHL"
        });
        bool t3Success = t3Res is CreatedAtActionResult;
        AddResult("Team", "Add Rahul's Team (new)", t3Success, "SUCCESS", t3Success ? "SUCCESS" : "FAILED", null);

        // 12. Update Bharat's Team without changing name -> SUCCESS
        var t4Res = await _teamsController.UpdateTeam(t1Id, new UpdateTeamRequest
        {
            Name = t1Name,
            ShortName = "BHT"
        });
        bool t4Success = t4Res is OkObjectResult;
        AddResult("Team", "Update Bharat's Team without changing name (self-exemption)", t4Success, "SUCCESS", t4Success ? "SUCCESS" : "FAILED", null);

        // 13. Rename Bharat's Team to existing Rahul's Team -> BLOCKED
        var t5Res = await _teamsController.UpdateTeam(t1Id, new UpdateTeamRequest
        {
            Name = t2Name,
            ShortName = "BHT"
        });
        bool t5Blocked = t5Res is BadRequestObjectResult;
        AddResult("Team", "Rename Bharat's Team -> Rahul's Team", t5Blocked, "BLOCKED", t5Blocked ? "BLOCKED" : "ALLOWED", null);

        // 14. Team Case and whitespace check
        var t6Res = await _teamsController.CreateTeam(new CreateTeamRequest
        {
            Name = "  " + t1Name.ToLower() + "  ",
            ShortName = "BH3"
        });
        bool t6Blocked = t6Res is BadRequestObjectResult;
        AddResult("Team", "Team case and whitespace check", t6Blocked, "BLOCKED", t6Blocked ? "BLOCKED" : "ALLOWED", null);

        // ==========================================
        // 3. SERIES TESTS
        // ==========================================
        string s1Name = pfx + "Test JDK";
        string s2Name = pfx + "Box Cricket";

        // 15. Add Test JDK (new) -> SUCCESS
        var s1Res = await _seriesController.CreateSeries(new CreateSeriesRequest
        {
            Name = s1Name,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(7),
            Status = "Scheduled"
        });
        bool s1Success = s1Res is CreatedAtActionResult;
        int s1Id = s1Success ? ((SeriesDto)((CreatedAtActionResult)s1Res).Value!).Id : 0;
        AddResult("Series", "Add Test JDK (new)", s1Success, "SUCCESS", s1Success ? "SUCCESS" : "FAILED", null);

        // 16. Add Test JDK again -> BLOCKED
        var s2Res = await _seriesController.CreateSeries(new CreateSeriesRequest
        {
            Name = s1Name,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(7),
            Status = "Scheduled"
        });
        bool s2Blocked = s2Res is BadRequestObjectResult;
        string? s2Msg = null;
        if (s2Res is BadRequestObjectResult brS2 && brS2.Value != null)
        {
            var msgProp = brS2.Value.GetType().GetProperty("message");
            s2Msg = msgProp?.GetValue(brS2.Value)?.ToString();
        }
        AddResult("Series", "Add duplicate Test JDK", s2Blocked && s2Msg == "Series name already exists.", "BLOCKED", s2Blocked ? "BLOCKED" : "ALLOWED", s2Msg);

        // 17. Add Box Cricket (new) -> SUCCESS
        var s3Res = await _seriesController.CreateSeries(new CreateSeriesRequest
        {
            Name = s2Name,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(5),
            Status = "Scheduled"
        });
        bool s3Success = s3Res is CreatedAtActionResult;
        AddResult("Series", "Add Box Cricket (new)", s3Success, "SUCCESS", s3Success ? "SUCCESS" : "FAILED", null);

        // 18. Update Test JDK without changing name -> SUCCESS
        var s4Res = await _seriesController.UpdateSeries(s1Id, new UpdateSeriesRequest
        {
            Name = s1Name,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(7),
            Status = "Scheduled"
        });
        bool s4Success = s4Res is OkObjectResult;
        AddResult("Series", "Update Test JDK without changing name (self-exemption)", s4Success, "SUCCESS", s4Success ? "SUCCESS" : "FAILED", null);

        // 19. Rename Test JDK to Box Cricket -> BLOCKED
        var s5Res = await _seriesController.UpdateSeries(s1Id, new UpdateSeriesRequest
        {
            Name = s2Name,
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(7),
            Status = "Scheduled"
        });
        bool s5Blocked = s5Res is BadRequestObjectResult;
        AddResult("Series", "Rename Test JDK -> Box Cricket", s5Blocked, "BLOCKED", s5Blocked ? "BLOCKED" : "ALLOWED", null);

        // 20. Series Case and whitespace check
        var s6Res = await _seriesController.CreateSeries(new CreateSeriesRequest
        {
            Name = "  " + s1Name.ToUpper() + "  ",
            StartDate = DateTime.UtcNow.Date,
            EndDate = DateTime.UtcNow.Date.AddDays(5),
            Status = "Scheduled"
        });
        bool s6Blocked = s6Res is BadRequestObjectResult;
        AddResult("Series", "Series case and whitespace check", s6Blocked, "BLOCKED", s6Blocked ? "BLOCKED" : "ALLOWED", null);

        // ==========================================
        // 4. DATABASE DIRECT CONSTRAINT VIOLATION TESTS
        // ==========================================
        // 21. Direct DB Insert duplicate Player -> caught by unique index
        bool playerDbIndexCaught = false;
        try
        {
            var dupPlayer = new Player
            {
                FirstName = pFirst,
                LastName = pLast,
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.Players.AddAsync(dupPlayer);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            playerDbIndexCaught = true;
            _context.ChangeTracker.Clear();
        }
        AddResult("Database", "Direct DB Insert duplicate Player prevented by IX_Players_FirstName_LastName_Active", playerDbIndexCaught, "BLOCKED", playerDbIndexCaught ? "BLOCKED" : "ALLOWED", null);

        // 22. Direct DB Insert duplicate Team -> caught by unique index
        bool teamDbIndexCaught = false;
        try
        {
            var dupTeam = new Team
            {
                Name = t1Name,
                ShortName = "DUP",
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.Teams.AddAsync(dupTeam);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            teamDbIndexCaught = true;
            _context.ChangeTracker.Clear();
        }
        AddResult("Database", "Direct DB Insert duplicate Team prevented by IX_Teams_Name_Active", teamDbIndexCaught, "BLOCKED", teamDbIndexCaught ? "BLOCKED" : "ALLOWED", null);

        // 23. Direct DB Insert duplicate Series -> caught by unique index
        bool seriesDbIndexCaught = false;
        try
        {
            var dupSeries = new Series
            {
                Name = s1Name,
                StartDate = DateTime.UtcNow.Date,
                EndDate = DateTime.UtcNow.Date.AddDays(3),
                Status = "Scheduled",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _context.Series.AddAsync(dupSeries);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            seriesDbIndexCaught = true;
            _context.ChangeTracker.Clear();
        }
        AddResult("Database", "Direct DB Insert duplicate Series prevented by IX_Series_Name_Active", seriesDbIndexCaught, "BLOCKED", seriesDbIndexCaught ? "BLOCKED" : "ALLOWED", null);

        int passedCount = results.Count(r => r.Passed);
        int failedCount = results.Count(r => !r.Passed);

        return Ok(new
        {
            allPassed = failedCount == 0,
            totalTests = results.Count,
            passedCount,
            failedCount,
            results
        });
    }
}
