using Microsoft.AspNetCore.Mvc;
using CricketApp.Api.Models;
using CricketApp.Api.Services;

namespace CricketApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HatTrickTestController : ControllerBase
{
    [HttpGet("run-all")]
    public IActionResult RunAllTests()
    {
        var testResults = new List<HatTrickTestCaseResult>();

        int ballIdCounter = 1;

        BallEvent CreateBall(
            int bowlerId,
            bool isWicket,
            string? wicketType = null,
            bool bowlerCredited = false,
            bool isLegal = true,
            string eventType = "Normal",
            string extraType = "None",
            int overNumber = 1,
            int ballNumber = 1,
            int deliveryNumber = 1)
        {
            return new BallEvent
            {
                Id = ballIdCounter++,
                MatchId = 1,
                InningsId = 1,
                BowlerPlayerId = bowlerId,
                StrikerPlayerId = 10,
                NonStrikerPlayerId = 11,
                OverNumber = overNumber,
                BallNumber = ballNumber,
                DeliveryNumber = deliveryNumber,
                IsLegalBall = isLegal,
                IsWicket = isWicket,
                WicketType = wicketType,
                BowlerCreditedWicket = bowlerCredited,
                EventType = eventType,
                ExtraType = extraType,
                Runs = (extraType == "Wide" || extraType == "NoBall") ? 1 : 0,
                BatRuns = 0,
                ExtraRuns = (extraType == "Wide" || extraType == "NoBall") ? 1 : 0
            };
        }

        void AssertCase(string testName, IEnumerable<BallEvent> bowlerDeliveries, int expectedHatTricks, int expectedWickets)
        {
            var deliveriesList = bowlerDeliveries.ToList();
            int actualHatTricks = CricketCalculationHelper.CalculateHatTricks(deliveriesList);
            int actualWickets = deliveriesList.Count(b => b.IsWicket && b.BowlerCreditedWicket);

            bool passed = actualHatTricks == expectedHatTricks && actualWickets == expectedWickets;

            testResults.Add(new HatTrickTestCaseResult
            {
                TestName = testName,
                Passed = passed,
                ExpectedHatTricks = expectedHatTricks,
                ActualHatTricks = actualHatTricks,
                ExpectedWickets = expectedWickets,
                ActualWickets = actualWickets
            });
        }

        // TEST 1: Wicket, Wicket, Wicket -> Wickets = 3, Hat-Tricks = 1
        ballIdCounter = 1;
        var t1 = new List<BallEvent>
        {
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Caught", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Stumped", bowlerCredited: true, isLegal: true, eventType: "Wicket")
        };
        AssertCase("TEST 1: Wicket, Wicket, Wicket -> Hat-Tricks = 1", t1, expectedHatTricks: 1, expectedWickets: 3);

        // TEST 2: Wicket, Dot, Wicket, Wicket -> Wickets = 3, Hat-Tricks = 0
        ballIdCounter = 1;
        var t2 = new List<BallEvent>
        {
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: false, isLegal: true, eventType: "Normal"), // dot ball
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket")
        };
        AssertCase("TEST 2: Wicket, Dot, Wicket, Wicket -> Hat-Tricks = 0", t2, expectedHatTricks: 0, expectedWickets: 3);

        // TEST 3: Wicket, Wide, Wicket, Wicket -> Wickets = 3, Hat-Tricks = 1 (Wide doesn't break)
        ballIdCounter = 1;
        var t3 = new List<BallEvent>
        {
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: false, isLegal: false, eventType: "Wide", extraType: "Wide"),
            CreateBall(1, isWicket: true, wicketType: "Caught", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Stumped", bowlerCredited: true, isLegal: true, eventType: "Wicket")
        };
        AssertCase("TEST 3: Wicket, Wide, Wicket, Wicket -> Hat-Tricks = 1", t3, expectedHatTricks: 1, expectedWickets: 3);

        // TEST 4: Wicket, No Ball, Wicket, Wicket -> Wickets = 3, Hat-Tricks = 1 (No Ball doesn't break)
        ballIdCounter = 1;
        var t4 = new List<BallEvent>
        {
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: false, isLegal: false, eventType: "NoBall", extraType: "NoBall"),
            CreateBall(1, isWicket: true, wicketType: "Caught", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Stumped", bowlerCredited: true, isLegal: true, eventType: "Wicket")
        };
        AssertCase("TEST 4: Wicket, No Ball, Wicket, Wicket -> Hat-Tricks = 1", t4, expectedHatTricks: 1, expectedWickets: 3);

        // TEST 5: Wicket, Wicket, Run, Wicket -> Wickets = 3, Hat-Tricks = 0
        ballIdCounter = 1;
        var t5 = new List<BallEvent>
        {
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: false, isLegal: true, eventType: "Normal"), // 1 run
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket")
        };
        AssertCase("TEST 5: Wicket, Wicket, Run, Wicket -> Hat-Tricks = 0", t5, expectedHatTricks: 0, expectedWickets: 3);

        // TEST 6: Bowler A: W, W; Bowler B: W -> Bowler A HT = 0, Bowler B HT = 0
        ballIdCounter = 1;
        var t6BowlerA = new List<BallEvent>
        {
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Caught", bowlerCredited: true, isLegal: true, eventType: "Wicket")
        };
        var t6BowlerB = new List<BallEvent>
        {
            CreateBall(2, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket")
        };
        AssertCase("TEST 6A: Bowler A (W, W) -> Hat-Tricks = 0", t6BowlerA, expectedHatTricks: 0, expectedWickets: 2);
        AssertCase("TEST 6B: Bowler B (W) -> Hat-Tricks = 0", t6BowlerB, expectedHatTricks: 0, expectedWickets: 1);

        // TEST 7: Bowler A: W, W, W -> Bowler A HT = 1
        ballIdCounter = 1;
        var t7 = new List<BallEvent>
        {
            CreateBall(1, isWicket: true, wicketType: "Caught", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Caught", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Caught", bowlerCredited: true, isLegal: true, eventType: "Wicket")
        };
        AssertCase("TEST 7: Bowler A (W, W, W) -> Hat-Tricks = 1", t7, expectedHatTricks: 1, expectedWickets: 3);

        // TEST 8: Bowler A: W, W, W, W -> Bowler A HT = 1 (NOT 2)
        ballIdCounter = 1;
        var t8 = new List<BallEvent>
        {
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket")
        };
        AssertCase("TEST 8: Bowler A (W, W, W, W) -> Hat-Tricks = 1 (NOT 2)", t8, expectedHatTricks: 1, expectedWickets: 4);

        // TEST 9: Bowler A: W, W, W, later: W, W, W -> Bowler A HT = 2
        ballIdCounter = 1;
        var t9 = new List<BallEvent>
        {
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: false, isLegal: true, eventType: "Normal"), // dot ball
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket")
        };
        AssertCase("TEST 9: Bowler A (W, W, W, dot, W, W, W) -> Hat-Tricks = 2", t9, expectedHatTricks: 2, expectedWickets: 6);

        // TEST 10: Wicket types: Caught, Bowled, Stumped -> Hat-Tricks = 1
        ballIdCounter = 1;
        var t10 = new List<BallEvent>
        {
            CreateBall(1, isWicket: true, wicketType: "Caught", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Stumped", bowlerCredited: true, isLegal: true, eventType: "Wicket")
        };
        AssertCase("TEST 10: Caught, Bowled, Stumped -> Hat-Tricks = 1", t10, expectedHatTricks: 1, expectedWickets: 3);

        // TEST 11: Bowled, Caught, Run Out -> Hat-Tricks = 0 (Run Out not credited to bowler)
        ballIdCounter = 1;
        var t11 = new List<BallEvent>
        {
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Caught", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "RunOut", bowlerCredited: false, isLegal: true, eventType: "Wicket")
        };
        AssertCase("TEST 11: Bowled, Caught, Run Out -> Hat-Tricks = 0", t11, expectedHatTricks: 0, expectedWickets: 2);

        // TEST 12: W, W, W, then another wicket after a normal legal delivery -> Hat-Tricks = 1
        ballIdCounter = 1;
        var t12 = new List<BallEvent>
        {
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: false, isLegal: true, eventType: "Normal"), // normal legal delivery
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket")
        };
        AssertCase("TEST 12: W, W, W, dot, W -> Hat-Tricks = 1", t12, expectedHatTricks: 1, expectedWickets: 4);

        // TEST 13: Dead ball does not break streak
        ballIdCounter = 1;
        var t13 = new List<BallEvent>
        {
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: false, isLegal: false, eventType: "DeadBall"),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket"),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket")
        };
        AssertCase("TEST 13: W, DeadBall, W, W -> Hat-Tricks = 1", t13, expectedHatTricks: 1, expectedWickets: 3);

        // TEST 14: Over split across bowler's spells
        ballIdCounter = 1;
        var t14 = new List<BallEvent>
        {
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket", overNumber: 1, ballNumber: 5),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket", overNumber: 1, ballNumber: 6),
            CreateBall(1, isWicket: true, wicketType: "Bowled", bowlerCredited: true, isLegal: true, eventType: "Wicket", overNumber: 3, ballNumber: 1)
        };
        AssertCase("TEST 14: Wicket on Over 1 Ball 5, Over 1 Ball 6, Over 3 Ball 1 -> Hat-Tricks = 1", t14, expectedHatTricks: 1, expectedWickets: 3);

        bool allPassed = testResults.All(r => r.Passed);
        return Ok(new
        {
            AllPassed = allPassed,
            Total = testResults.Count,
            PassedCount = testResults.Count(r => r.Passed),
            FailedCount = testResults.Count(r => !r.Passed),
            Results = testResults
        });
    }
}

public class HatTrickTestCaseResult
{
    public string TestName { get; set; } = string.Empty;
    public bool Passed { get; set; }
    public int ExpectedHatTricks { get; set; }
    public int ActualHatTricks { get; set; }
    public int ExpectedWickets { get; set; }
    public int ActualWickets { get; set; }
}
