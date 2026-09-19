using CricketApp.Api.Models;
using CricketApp.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CricketApp.Api.Controllers;

public class StatusValidationTestCaseResult
{
    public int CaseNumber { get; set; }
    public string TestName { get; set; } = string.Empty;
    public bool Passed { get; set; }
    public string Expected { get; set; } = string.Empty;
    public string Actual { get; set; } = string.Empty;
    public string? Message { get; set; }
}

[ApiController]
[Route("api/[controller]")]
public class StatusValidationTestController : ControllerBase
{
    private readonly IStatusValidationService _validator;

    public StatusValidationTestController(IStatusValidationService validator)
    {
        _validator = validator;
    }

    [HttpGet("run-all")]
    public IActionResult RunAllTests()
    {
        var results = new List<StatusValidationTestCaseResult>();

        void AssertCase(int num, string testName, bool shouldBeValid, ValidationResult res)
        {
            bool passed = res.IsValid == shouldBeValid;
            results.Add(new StatusValidationTestCaseResult
            {
                CaseNumber = num,
                TestName = testName,
                Passed = passed,
                Expected = shouldBeValid ? "VALID" : "BLOCKED",
                Actual = res.IsValid ? "VALID" : "BLOCKED",
                Message = res.ErrorMessage
            });
        }

        // Helpers
        Series MakeSeries(string status) => new Series { Id = 1, Name = "Test Series", Status = status };
        Match MakeMatch(string matchStatus, Series series, bool withScorecard = false)
        {
            var m = new Match
            {
                Id = 10,
                SeriesId = series.Id,
                Series = series,
                Status = matchStatus,
                Innings = new List<MatchInnings>()
            };

            if (withScorecard)
            {
                var inn = new MatchInnings
                {
                    Id = 100,
                    MatchId = m.Id,
                    InningsNumber = 1,
                    Status = "Completed",
                    BattingPerformances = new List<MatchBattingPerformance>
                    {
                        new() { Id = 1, PlayerId = 1, Runs = 25, BallsFaced = 15 }
                    },
                    BowlingPerformances = new List<MatchBowlingPerformance>
                    {
                        new() { Id = 1, PlayerId = 2, BallsBowled = 12, RunsConceded = 10, Wickets = 1 }
                    }
                };
                m.Innings.Add(inn);
            }

            return m;
        }

        // 1. Scheduled Series -> add Scheduled Match = SUCCESS
        var sScheduled = MakeSeries("Scheduled");
        AssertCase(1, "Scheduled Series -> add Scheduled Match", true, _validator.ValidateMatchCreation(sScheduled, "Scheduled"));

        // 2. Scheduled Series -> add InProgress Match = BLOCKED
        AssertCase(2, "Scheduled Series -> add InProgress Match", false, _validator.ValidateMatchCreation(sScheduled, "InProgress"));

        // 3. Scheduled Series -> InProgress = SUCCESS
        AssertCase(3, "Scheduled Series -> InProgress", true, _validator.ValidateSeriesStatusTransition(sScheduled.Status, "InProgress", new List<Match>()));

        // 4. Scheduled Series -> Completed = BLOCKED
        AssertCase(4, "Scheduled Series -> Completed", false, _validator.ValidateSeriesStatusTransition(sScheduled.Status, "Completed", new List<Match>()));

        // 5. InProgress Series -> add Scheduled Match = SUCCESS
        var sInProgress = MakeSeries("InProgress");
        AssertCase(5, "InProgress Series -> add Scheduled Match", true, _validator.ValidateMatchCreation(sInProgress, "Scheduled"));

        // 6. InProgress Series -> add InProgress Match = SUCCESS
        AssertCase(6, "InProgress Series -> add InProgress Match", true, _validator.ValidateMatchCreation(sInProgress, "InProgress"));

        // 7. InProgress Series -> Completed = SUCCESS (when matches inactive)
        var inactiveMatches = new List<Match>
        {
            MakeMatch("Completed", sInProgress),
            MakeMatch("Cancelled", sInProgress),
            MakeMatch("Abandoned", sInProgress)
        };
        AssertCase(7, "InProgress Series -> Completed (inactive matches)", true, _validator.ValidateSeriesStatusTransition(sInProgress.Status, "Completed", inactiveMatches));

        // 7b. InProgress Series -> Completed = BLOCKED (when active matches exist)
        var activeMatches = new List<Match>
        {
            MakeMatch("Scheduled", sInProgress)
        };
        AssertCase(701, "InProgress Series -> Completed (with active matches)", false, _validator.ValidateSeriesStatusTransition(sInProgress.Status, "Completed", activeMatches));

        // 8. Completed Series -> add Match = BLOCKED
        var sCompleted = MakeSeries("Completed");
        AssertCase(8, "Completed Series -> add Match", false, _validator.ValidateMatchCreation(sCompleted, "Scheduled"));

        // 9. Cancelled Series -> add Match = BLOCKED
        var sCancelled = MakeSeries("Cancelled");
        AssertCase(9, "Cancelled Series -> add Match", false, _validator.ValidateMatchCreation(sCancelled, "Scheduled"));

        // 10. Scheduled Match + Scheduled Series -> Start = BLOCKED
        var mScheduledInScheduled = MakeMatch("Scheduled", sScheduled);
        AssertCase(10, "Scheduled Match + Scheduled Series -> Start", false, _validator.ValidateMatchStatusTransition(mScheduledInScheduled, sScheduled, "InProgress"));

        // 11. Scheduled Match + InProgress Series -> Start = SUCCESS
        var mScheduledInProg = MakeMatch("Scheduled", sInProgress);
        AssertCase(11, "Scheduled Match + InProgress Series -> Start", true, _validator.ValidateMatchStatusTransition(mScheduledInProg, sInProgress, "InProgress"));

        // 12. Scheduled Match -> Cancelled = SUCCESS
        AssertCase(12, "Scheduled Match -> Cancelled", true, _validator.ValidateMatchStatusTransition(mScheduledInProg, sInProgress, "Cancelled"));

        // 13. Scheduled Match -> Abandoned = SUCCESS
        AssertCase(13, "Scheduled Match -> Abandoned", true, _validator.ValidateMatchStatusTransition(mScheduledInProg, sInProgress, "Abandoned"));

        // 14. InProgress Match -> Completed = SUCCESS (with scorecard)
        var mInProgWithScorecard = MakeMatch("InProgress", sInProgress, withScorecard: true);
        AssertCase(14, "InProgress Match -> Completed (with scorecard)", true, _validator.ValidateMatchStatusTransition(mInProgWithScorecard, sInProgress, "Completed"));

        // 14b. InProgress Match -> Completed = BLOCKED (without scorecard)
        var mInProgNoScorecard = MakeMatch("InProgress", sInProgress, withScorecard: false);
        AssertCase(1401, "InProgress Match -> Completed (without scorecard)", false, _validator.ValidateMatchStatusTransition(mInProgNoScorecard, sInProgress, "Completed"));

        // 15. InProgress Match -> Cancelled = SUCCESS
        AssertCase(15, "InProgress Match -> Cancelled", true, _validator.ValidateMatchStatusTransition(mInProgWithScorecard, sInProgress, "Cancelled"));

        // 16. InProgress Match -> Abandoned = SUCCESS
        AssertCase(16, "InProgress Match -> Abandoned", true, _validator.ValidateMatchStatusTransition(mInProgWithScorecard, sInProgress, "Abandoned"));

        // 17. Completed Match -> Live Scoring = BLOCKED
        var mCompleted = MakeMatch("Completed", sInProgress);
        AssertCase(17, "Completed Match -> Live Scoring", false, _validator.ValidateLiveScoringAllowed(mCompleted, sInProgress));

        // 18. Cancelled Match -> Live Scoring = BLOCKED
        var mCancelled = MakeMatch("Cancelled", sInProgress);
        AssertCase(18, "Cancelled Match -> Live Scoring", false, _validator.ValidateLiveScoringAllowed(mCancelled, sInProgress));

        // 19. Abandoned Match -> Live Scoring = BLOCKED
        var mAbandoned = MakeMatch("Abandoned", sInProgress);
        AssertCase(19, "Abandoned Match -> Live Scoring", false, _validator.ValidateLiveScoringAllowed(mAbandoned, sInProgress));

        // 20. InProgress Series + InProgress Match -> Live Scoring = SUCCESS
        var mInProgress = MakeMatch("InProgress", sInProgress);
        AssertCase(20, "InProgress Series + InProgress Match -> Live Scoring", true, _validator.ValidateLiveScoringAllowed(mInProgress, sInProgress));

        // 21. InProgress Match + Completed Series -> Live Scoring = BLOCKED
        var mInCompletedSeries = MakeMatch("InProgress", sCompleted);
        AssertCase(21, "InProgress Match + Completed Series -> Live Scoring", false, _validator.ValidateLiveScoringAllowed(mInCompletedSeries, sCompleted));

        // 22. Series Cancellation with InProgress match = BLOCKED
        var matchesWithInProg = new List<Match> { MakeMatch("InProgress", sInProgress) };
        AssertCase(22, "Series Cancellation with InProgress match", false, _validator.ValidateSeriesCancellation("InProgress", matchesWithInProg));

        // 23. Series Cancellation without InProgress match = SUCCESS
        var matchesWithoutInProg = new List<Match> { MakeMatch("Scheduled", sScheduled), MakeMatch("Completed", sScheduled) };
        AssertCase(23, "Series Cancellation without InProgress match", true, _validator.ValidateSeriesCancellation("Scheduled", matchesWithoutInProg));

        // 24. Completed/Cancelled Match status change = BLOCKED
        AssertCase(24, "Completed Match -> change status", false, _validator.ValidateMatchStatusTransition(mCompleted, sInProgress, "InProgress"));
        AssertCase(25, "Cancelled Match -> change status", false, _validator.ValidateMatchStatusTransition(mCancelled, sInProgress, "Scheduled"));
        AssertCase(26, "Abandoned Match -> change status", false, _validator.ValidateMatchStatusTransition(mAbandoned, sInProgress, "InProgress"));

        // 27. Completed/Cancelled Series status change = BLOCKED
        AssertCase(27, "Completed Series -> InProgress", false, _validator.ValidateSeriesStatusTransition(sCompleted.Status, "InProgress", new List<Match>()));
        AssertCase(28, "Cancelled Series -> InProgress", false, _validator.ValidateSeriesStatusTransition(sCancelled.Status, "InProgress", new List<Match>()));

        bool allPassed = results.All(r => r.Passed);
        return Ok(new
        {
            AllPassed = allPassed,
            TotalTests = results.Count,
            PassedCount = results.Count(r => r.Passed),
            FailedCount = results.Count(r => !r.Passed),
            Results = results
        });
    }
}
