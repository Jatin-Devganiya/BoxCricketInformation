using Microsoft.AspNetCore.Mvc;
using CricketApp.Api.Models;
using CricketApp.Api.Services;

namespace CricketApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ResultTestController : ControllerBase
{
    [HttpGet("run-all")]
    public IActionResult RunAllTests()
    {
        var testResults = new List<TestCaseResult>();

        // Team fixtures
        var teamAlpha = new Team { Id = 101, Name = "Alpha Titans", ShortName = "AT" };
        var teamBeta = new Team { Id = 102, Name = "Beta Warriors", ShortName = "BW" };

        // Helper to build match
        Match BuildMatch(string status, int reqOvers, Team t1, Team t2) => new Match
        {
            Id = 999,
            Status = status,
            RequiredOvers = reqOvers,
            Team1Id = t1.Id,
            Team1 = t1,
            Team2Id = t2.Id,
            Team2 = t2,
            Innings = new List<MatchInnings>()
        };

        MatchInnings BuildInnings(Match m, int innNum, Team batTeam, int runs, int wickets, int balls, string status) => new MatchInnings
        {
            MatchId = m.Id,
            InningsNumber = innNum,
            TeamId = batTeam.Id,
            Team = batTeam,
            Runs = runs,
            Wickets = wickets,
            Balls = balls,
            Status = status
        };

        void RunCase(string testName, Match match, int? customWickets, int? customTarget, string expDesc, string expType, int? expMargin, int? expWinnerId)
        {
            var res = MatchResultCalculator.Calculate(match, customWickets, customTarget);
            bool descMatch = res.ResultDescription == expDesc;
            bool typeMatch = res.ResultType == expType;
            bool marginMatch = res.WinningMargin == expMargin;
            bool winnerMatch = res.WinningTeamId == expWinnerId;

            bool passed = descMatch && typeMatch && marginMatch && winnerMatch;

            testResults.Add(new TestCaseResult
            {
                TestName = testName,
                Passed = passed,
                ExpectedDescription = expDesc,
                ActualDescription = res.ResultDescription,
                ExpectedType = expType,
                ActualType = res.ResultType,
                ExpectedMargin = expMargin,
                ActualMargin = res.WinningMargin,
                ExpectedWinnerId = expWinnerId,
                ActualWinnerId = res.WinningTeamId,
                Summary = res.Summary
            });
        }

        // 1. Chasing team wins by wickets (e.g. 5 wkts)
        {
            var m = BuildMatch("Completed", 10, teamAlpha, teamBeta);
            m.Innings.Add(BuildInnings(m, 1, teamAlpha, 120, 6, 60, "Completed"));
            m.Innings.Add(BuildInnings(m, 2, teamBeta, 124, 5, 52, "Completed"));
            RunCase("Case 01: Chasing team wins by 5 wickets", m, null, null, "Beta Warriors won by 5 wickets", "wickets", 5, teamBeta.Id);
        }

        // 2. Chasing team wins by 1 wicket (singular form test)
        {
            var m = BuildMatch("Completed", 10, teamAlpha, teamBeta);
            m.Innings.Add(BuildInnings(m, 1, teamAlpha, 100, 8, 60, "Completed"));
            m.Innings.Add(BuildInnings(m, 2, teamBeta, 101, 9, 58, "Completed"));
            RunCase("Case 02: Chasing team wins by 1 wicket (singular)", m, null, null, "Beta Warriors won by 1 wicket", "wickets", 1, teamBeta.Id);
        }

        // 3. Chasing team wins by 10 wickets (0 wickets lost)
        {
            var m = BuildMatch("Completed", 10, teamAlpha, teamBeta);
            m.Innings.Add(BuildInnings(m, 1, teamAlpha, 80, 10, 50, "Completed"));
            m.Innings.Add(BuildInnings(m, 2, teamBeta, 82, 0, 36, "Completed"));
            RunCase("Case 03: Chasing team wins by 10 wickets", m, null, null, "Beta Warriors won by 10 wickets", "wickets", 10, teamBeta.Id);
        }

        // 4. Defending team wins by runs (e.g. 24 runs)
        {
            var m = BuildMatch("Completed", 10, teamAlpha, teamBeta);
            m.Innings.Add(BuildInnings(m, 1, teamAlpha, 150, 4, 60, "Completed"));
            m.Innings.Add(BuildInnings(m, 2, teamBeta, 126, 10, 55, "Completed"));
            RunCase("Case 04: Defending team wins by 24 runs", m, null, null, "Alpha Titans won by 24 runs", "runs", 24, teamAlpha.Id);
        }

        // 5. Defending team wins by 1 run (singular form test)
        {
            var m = BuildMatch("Completed", 10, teamAlpha, teamBeta);
            m.Innings.Add(BuildInnings(m, 1, teamAlpha, 135, 5, 60, "Completed"));
            m.Innings.Add(BuildInnings(m, 2, teamBeta, 134, 10, 59, "Completed"));
            RunCase("Case 05: Defending team wins by 1 run (singular)", m, null, null, "Alpha Titans won by 1 run", "runs", 1, teamAlpha.Id);
        }

        // 6. Defending team wins when chasing team finishes all overs without reaching target
        {
            var m = BuildMatch("Completed", 10, teamAlpha, teamBeta);
            m.Innings.Add(BuildInnings(m, 1, teamAlpha, 140, 5, 60, "Completed"));
            m.Innings.Add(BuildInnings(m, 2, teamBeta, 125, 4, 60, "Completed"));
            RunCase("Case 06: Overs completed, defending team wins by 15 runs", m, null, null, "Alpha Titans won by 15 runs", "runs", 15, teamAlpha.Id);
        }

        // 7. Tied match - scores equal when 2nd innings all out
        {
            var m = BuildMatch("Completed", 10, teamAlpha, teamBeta);
            m.Innings.Add(BuildInnings(m, 1, teamAlpha, 115, 7, 60, "Completed"));
            m.Innings.Add(BuildInnings(m, 2, teamBeta, 115, 10, 58, "Completed"));
            RunCase("Case 07: Tied match (all out)", m, null, null, "Match tied", "tie", 0, null);
        }

        // 8. Tied match - scores equal when 2nd innings overs complete with wickets in hand
        {
            var m = BuildMatch("Completed", 10, teamAlpha, teamBeta);
            m.Innings.Add(BuildInnings(m, 1, teamAlpha, 115, 6, 60, "Completed"));
            m.Innings.Add(BuildInnings(m, 2, teamBeta, 115, 5, 60, "Completed"));
            RunCase("Case 08: Tied match (overs complete with wickets in hand)", m, null, null, "Match tied", "tie", 0, null);
        }

        // 9. Reversed order: Team Beta batted 1st, Team Alpha batted 2nd (chasing victory)
        {
            var m = BuildMatch("Completed", 10, teamAlpha, teamBeta);
            m.Innings.Add(BuildInnings(m, 1, teamBeta, 95, 8, 60, "Completed"));
            m.Innings.Add(BuildInnings(m, 2, teamAlpha, 98, 3, 45, "Completed"));
            RunCase("Case 09: Reversed order, Alpha Titans chases and wins by 7 wickets", m, null, null, "Alpha Titans won by 7 wickets", "wickets", 7, teamAlpha.Id);
        }

        // 10. Reversed order: Team Beta batted 1st and won defending
        {
            var m = BuildMatch("Completed", 10, teamAlpha, teamBeta);
            m.Innings.Add(BuildInnings(m, 1, teamBeta, 160, 5, 60, "Completed"));
            m.Innings.Add(BuildInnings(m, 2, teamAlpha, 130, 9, 60, "Completed"));
            RunCase("Case 10: Reversed order, Beta Warriors defends and wins by 30 runs", m, null, null, "Beta Warriors won by 30 runs", "runs", 30, teamBeta.Id);
        }

        // 11. Custom wicket limit (Box cricket: 8 wickets per team)
        {
            var m = BuildMatch("Completed", 8, teamAlpha, teamBeta);
            m.Innings.Add(BuildInnings(m, 1, teamAlpha, 70, 6, 48, "Completed"));
            m.Innings.Add(BuildInnings(m, 2, teamBeta, 71, 3, 35, "Completed"));
            RunCase("Case 11: Box cricket 8 wickets, won by 5 wickets", m, 8, null, "Beta Warriors won by 5 wickets", "wickets", 5, teamBeta.Id);
        }

        // 12. DLS / Adjusted target support (e.g. target reduced to 90 runs)
        {
            var m = BuildMatch("Completed", 10, teamAlpha, teamBeta);
            m.Innings.Add(BuildInnings(m, 1, teamAlpha, 140, 5, 60, "Completed"));
            m.Innings.Add(BuildInnings(m, 2, teamBeta, 92, 4, 38, "Completed"));
            RunCase("Case 12: Adjusted target of 90 reached -> won by 6 wickets", m, null, 90, "Beta Warriors won by 6 wickets", "wickets", 6, teamBeta.Id);
        }

        // 13. Status is Abandoned
        {
            var m = BuildMatch("Abandoned", 10, teamAlpha, teamBeta);
            m.Innings.Add(BuildInnings(m, 1, teamAlpha, 45, 2, 25, "InProgress"));
            RunCase("Case 13: Abandoned match status", m, null, null, "Match abandoned", "abandoned", null, null);
        }

        // 14. Status is Cancelled
        {
            var m = BuildMatch("Cancelled", 10, teamAlpha, teamBeta);
            RunCase("Case 14: Cancelled match status", m, null, null, "Match cancelled", "cancelled", null, null);
        }

        // 15. Incomplete match: only 1st innings finished, 2nd innings not started or in progress
        {
            var m = BuildMatch("InProgress", 10, teamAlpha, teamBeta);
            m.Innings.Add(BuildInnings(m, 1, teamAlpha, 120, 6, 60, "Completed"));
            m.Innings.Add(BuildInnings(m, 2, teamBeta, 40, 2, 20, "InProgress"));
            RunCase("Case 15: 2nd innings in progress -> Result pending", m, null, null, "Result pending", "pending", null, null);
        }

        // 16. Missing/null innings data safety
        {
            var m = BuildMatch("Scheduled", 10, teamAlpha, teamBeta);
            RunCase("Case 16: No innings started -> Result pending", m, null, null, "Result pending", "pending", null, null);
        }

        bool allPassed = testResults.All(t => t.Passed);
        return Ok(new
        {
            total = testResults.Count,
            passed = testResults.Count(t => t.Passed),
            failed = testResults.Count(t => !t.Passed),
            allPassed,
            results = testResults
        });
    }
}

public class TestCaseResult
{
    public string TestName { get; set; } = "";
    public bool Passed { get; set; }
    public string ExpectedDescription { get; set; } = "";
    public string ActualDescription { get; set; } = "";
    public string ExpectedType { get; set; } = "";
    public string ActualType { get; set; } = "";
    public int? ExpectedMargin { get; set; }
    public int? ActualMargin { get; set; }
    public int? ExpectedWinnerId { get; set; }
    public int? ActualWinnerId { get; set; }
    public string? Summary { get; set; }
}
