using CricketApp.Api.DTOs;
using CricketApp.Api.Models;
using CricketApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CricketApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MomTestController : ControllerBase
{
    public class ScenarioResult
    {
        public int TestNumber { get; set; }
        public string TestName { get; set; } = string.Empty;
        public bool Passed { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? SelectedPlayerName { get; set; }
        public double? TotalScore { get; set; }
        public object? Extra { get; set; }
    }

    [HttpGet("run-all")]
    public IActionResult RunAllScenarios()
    {
        var results = new List<ScenarioResult>();

        // Player definitions
        var p1 = new Player { Id = 101, FirstName = "Virat", LastName = "Kohli", PlayerCategory = "Batsman" };
        var p2 = new Player { Id = 102, FirstName = "Jasprit", LastName = "Bumrah", PlayerCategory = "Bowler" };
        var p3 = new Player { Id = 103, FirstName = "Hardik", LastName = "Pandya", PlayerCategory = "AllRounder" };
        var p4 = new Player { Id = 104, FirstName = "Rohit", LastName = "Sharma", PlayerCategory = "Batsman" };
        var p5 = new Player { Id = 105, FirstName = "Rashid", LastName = "Khan", PlayerCategory = "Bowler" };
        var allPlayers = new List<Player> { p1, p2, p3, p4, p5 };

        // Helper to create basic match
        Match CreateMatch(int? winningTeamId = 1)
        {
            var m = new Match
            {
                Id = 999,
                Team1Id = 1,
                Team2Id = 2,
                RequiredOvers = 10,
                Status = "Completed",
                WinningTeamId = winningTeamId,
                Team1 = new Team { Id = 1, Name = "Team Blue", ShortName = "BLU" },
                Team2 = new Team { Id = 2, Name = "Team Red", ShortName = "RED" },
                Innings = new List<MatchInnings>()
            };
            return m;
        }

        // SCENARIO 1: Best batter wins MOM
        {
            var match = CreateMatch(1);
            var inn1 = new MatchInnings
            {
                Id = 1,
                MatchId = match.Id,
                InningsNumber = 1,
                TeamId = 1,
                BattingPerformances = new List<MatchBattingPerformance>
                {
                    // Virat: 85 runs, 45 balls, 7x4, 3x6, SR 188.89
                    new() { PlayerId = p1.Id, Player = p1, Runs = 85, BallsFaced = 45, Fours = 7, Sixes = 3, IsOut = true }
                },
                BowlingPerformances = new List<MatchBowlingPerformance>()
            };
            var inn2 = new MatchInnings
            {
                Id = 2,
                MatchId = match.Id,
                InningsNumber = 2,
                TeamId = 2,
                BattingPerformances = new List<MatchBattingPerformance>
                {
                    new() { PlayerId = p2.Id, Player = p2, Runs = 12, BallsFaced = 15, Fours = 1, Sixes = 0, IsOut = true }
                },
                BowlingPerformances = new List<MatchBowlingPerformance>
                {
                    // Bumrah: 1 wkt, 24 runs, 3.0 overs (18 balls)
                    new() { PlayerId = p2.Id, Player = p2, BallsBowled = 18, RunsConceded = 24, Wickets = 1, MaidenOvers = 0 }
                }
            };
            match.Innings.Add(inn1);
            match.Innings.Add(inn2);

            var res = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            bool passed = res.SelectedPlayerId == p1.Id && res.TotalScore > 100;
            results.Add(new ScenarioResult
            {
                TestNumber = 1,
                TestName = "Best batter wins MOM",
                Passed = passed,
                Message = passed ? "Virat Kohli won MOM with high batting performance" : $"Failed: expected {p1.Id}, got {res.SelectedPlayerId}",
                SelectedPlayerName = res.SelectedPlayerName,
                TotalScore = res.TotalScore
            });
        }

        // SCENARIO 2: Best bowler wins MOM
        {
            var match = CreateMatch(1);
            var inn1 = new MatchInnings
            {
                Id = 1,
                MatchId = match.Id,
                InningsNumber = 1,
                TeamId = 1,
                BattingPerformances = new List<MatchBattingPerformance>
                {
                    // Rohit: 35 runs in 30 balls, 3x4
                    new() { PlayerId = p4.Id, Player = p4, Runs = 35, BallsFaced = 30, Fours = 3, Sixes = 0, IsOut = true }
                },
                BowlingPerformances = new List<MatchBowlingPerformance>
                {
                    // Bumrah: 4 wickets for 14 runs in 3 overs (Econ 4.67)
                    new() { PlayerId = p2.Id, Player = p2, BallsBowled = 18, RunsConceded = 14, Wickets = 4, MaidenOvers = 1 }
                }
            };
            match.Innings.Add(inn1);

            var res = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            bool passed = res.SelectedPlayerId == p2.Id && res.TotalScore >= 110;
            results.Add(new ScenarioResult
            {
                TestNumber = 2,
                TestName = "Best bowler wins MOM",
                Passed = passed,
                Message = passed ? "Jasprit Bumrah won MOM with 4 wickets & maiden" : $"Failed: expected {p2.Id}, got {res.SelectedPlayerId}",
                SelectedPlayerName = res.SelectedPlayerName,
                TotalScore = res.TotalScore
            });
        }

        // SCENARIO 3: All-rounder wins MOM
        {
            var match = CreateMatch(1);
            var inn1 = new MatchInnings
            {
                Id = 1,
                MatchId = match.Id,
                InningsNumber = 1,
                TeamId = 1,
                BattingPerformances = new List<MatchBattingPerformance>
                {
                    // Pure batsman: 65 runs, 45 balls, 5x4, 1x6 (SR 144) -> ~92 pts
                    new() { PlayerId = p1.Id, Player = p1, Runs = 65, BallsFaced = 45, Fours = 5, Sixes = 1, IsOut = true },
                    // All-rounder Hardik: 35 runs (25 balls, 3x4, SR 140)
                    new() { PlayerId = p3.Id, Player = p3, Runs = 35, BallsFaced = 25, Fours = 3, Sixes = 0, IsOut = true }
                },
                BowlingPerformances = new List<MatchBowlingPerformance>
                {
                    // All-rounder Hardik: 2 wickets for 16 runs in 2 overs (Econ 8.0)
                    new() { PlayerId = p3.Id, Player = p3, BallsBowled = 12, RunsConceded = 16, Wickets = 2, MaidenOvers = 0 }
                }
            };
            match.Innings.Add(inn1);

            var res = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            // Hardik gets: Batting(35+3+10=48) + Bowling(40+5=45) + All-rounder bonus(15) + Win bonus(5) = 113 pts vs Kohli 92+5=97 pts
            bool passed = res.SelectedPlayerId == p3.Id;
            results.Add(new ScenarioResult
            {
                TestNumber = 3,
                TestName = "All-rounder wins MOM",
                Passed = passed,
                Message = passed ? "Hardik Pandya won MOM with combined batting, bowling and all-rounder bonus" : $"Failed: expected {p3.Id}, got {res.SelectedPlayerId}",
                SelectedPlayerName = res.SelectedPlayerName,
                TotalScore = res.TotalScore
            });
        }

        // SCENARIO 4: Player from losing team wins because of exceptional performance
        {
            var match = CreateMatch(winningTeamId: 1); // Team 1 won
            var inn1 = new MatchInnings
            {
                Id = 1,
                MatchId = match.Id,
                InningsNumber = 1,
                TeamId = 2, // Losing team
                BattingPerformances = new List<MatchBattingPerformance>
                {
                    // Virat from Team 2 (Losing team): 110 runs in 55 balls (10x4, 5x6, SR 200) -> 170 pts, 0 win bonus
                    new() { PlayerId = p1.Id, Player = p1, Runs = 110, BallsFaced = 55, Fours = 10, Sixes = 5, IsOut = true }
                },
                BowlingPerformances = new List<MatchBowlingPerformance>()
            };
            var inn2 = new MatchInnings
            {
                Id = 2,
                MatchId = match.Id,
                InningsNumber = 2,
                TeamId = 1, // Winning team
                BattingPerformances = new List<MatchBattingPerformance>
                {
                    // Rohit from Team 1 (Winning team): 35 runs in 28 balls -> 49 pts + 5 win bonus = 54 pts
                    new() { PlayerId = p4.Id, Player = p4, Runs = 35, BallsFaced = 28, Fours = 4, Sixes = 0, IsOut = true }
                },
                BowlingPerformances = new List<MatchBowlingPerformance>()
            };
            match.Innings.Add(inn1);
            match.Innings.Add(inn2);

            var res = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            bool passed = res.SelectedPlayerId == p1.Id && res.Leaderboard.First(x => x.PlayerId == p1.Id).WinningTeamBonus == 0;
            results.Add(new ScenarioResult
            {
                TestNumber = 4,
                TestName = "Player from losing team wins because of exceptional performance",
                Passed = passed,
                Message = passed ? "Losing team player won MOM rightfully on sheer performance merit" : $"Failed: expected {p1.Id}, got {res.SelectedPlayerId}",
                SelectedPlayerName = res.SelectedPlayerName,
                TotalScore = res.TotalScore
            });
        }

        // SCENARIO 5: Two players have equal scores (tie-breaking)
        {
            var match = CreateMatch(null); // No winning team bonus
            var inn1 = new MatchInnings
            {
                Id = 1,
                MatchId = match.Id,
                InningsNumber = 1,
                TeamId = 1,
                BattingPerformances = new List<MatchBattingPerformance>
                {
                    // Virat: 40 runs (40 balls, 0 fours, 0 sixes, SR 100 -> +5 bonus). Total = 45 pts. 0 wkts.
                    new() { PlayerId = p1.Id, Player = p1, Runs = 40, BallsFaced = 40, Fours = 0, Sixes = 0, IsOut = true }
                },
                BowlingPerformances = new List<MatchBowlingPerformance>
                {
                    // Bumrah: 2 wkts (40 pts) + 1 maiden (5 pts) + 0 econ bonus (econ 10.0, 10 balls, 17 runs). Total = 45 pts. 2 wkts.
                    new() { PlayerId = p2.Id, Player = p2, BallsBowled = 10, RunsConceded = 17, Wickets = 2, MaidenOvers = 1 }
                }
            };
            match.Innings.Add(inn1);

            var res = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            // Both have 45 pts. Tie-breaker 1 is Wickets (Bumrah has 2, Virat has 0). Bumrah must win.
            bool passed = res.SelectedPlayerId == p2.Id;
            results.Add(new ScenarioResult
            {
                TestNumber = 5,
                TestName = "Two players equal scores (tie-breaker on wickets)",
                Passed = passed,
                Message = passed ? "Tie broken in favor of bowler with more wickets taken" : $"Failed: expected {p2.Id}, got {res.SelectedPlayerId}",
                SelectedPlayerName = res.SelectedPlayerName,
                TotalScore = res.TotalScore
            });
        }

        // SCENARIO 6: Player did not bat (bowler with 0 balls faced)
        {
            var match = CreateMatch(1);
            var inn1 = new MatchInnings
            {
                Id = 1,
                MatchId = match.Id,
                InningsNumber = 1,
                TeamId = 1,
                BattingPerformances = new List<MatchBattingPerformance>(), // Bumrah did not bat at all
                BowlingPerformances = new List<MatchBowlingPerformance>
                {
                    new() { PlayerId = p2.Id, Player = p2, BallsBowled = 12, RunsConceded = 10, Wickets = 2, MaidenOvers = 0 }
                }
            };
            match.Innings.Add(inn1);

            var res = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            var bumrahScore = res.Leaderboard.FirstOrDefault(x => x.PlayerId == p2.Id);
            bool passed = bumrahScore != null && bumrahScore.BattingPoints == 0 && bumrahScore.BowlingPoints > 0;
            results.Add(new ScenarioResult
            {
                TestNumber = 6,
                TestName = "Player did not bat",
                Passed = passed,
                Message = passed ? "Handled player with 0 batting stats cleanly without errors" : "Failed",
                SelectedPlayerName = res.SelectedPlayerName,
                TotalScore = res.TotalScore
            });
        }

        // SCENARIO 7: Player did not bowl (batter with 0 balls bowled)
        {
            var match = CreateMatch(1);
            var inn1 = new MatchInnings
            {
                Id = 1,
                MatchId = match.Id,
                InningsNumber = 1,
                TeamId = 1,
                BattingPerformances = new List<MatchBattingPerformance>
                {
                    new() { PlayerId = p1.Id, Player = p1, Runs = 50, BallsFaced = 35, Fours = 4, Sixes = 1, IsOut = false }
                },
                BowlingPerformances = new List<MatchBowlingPerformance>() // Virat did not bowl
            };
            match.Innings.Add(inn1);

            var res = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            var kohliScore = res.Leaderboard.FirstOrDefault(x => x.PlayerId == p1.Id);
            bool passed = kohliScore != null && kohliScore.BowlingPoints == 0 && kohliScore.BattingPoints > 0;
            results.Add(new ScenarioResult
            {
                TestNumber = 7,
                TestName = "Player did not bowl",
                Passed = passed,
                Message = passed ? "Handled player with 0 bowling stats cleanly without errors" : "Failed",
                SelectedPlayerName = res.SelectedPlayerName,
                TotalScore = res.TotalScore
            });
        }

        // SCENARIO 8: Zero balls faced (SR division by zero protection)
        {
            var match = CreateMatch(1);
            var inn1 = new MatchInnings
            {
                Id = 1,
                MatchId = match.Id,
                InningsNumber = 1,
                TeamId = 1,
                BattingPerformances = new List<MatchBattingPerformance>
                {
                    new() { PlayerId = p4.Id, Player = p4, Runs = 0, BallsFaced = 0, Fours = 0, Sixes = 0, IsOut = false }
                },
                BowlingPerformances = new List<MatchBowlingPerformance>()
            };
            match.Innings.Add(inn1);

            var res = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            var rohit = res.Leaderboard.FirstOrDefault(x => x.PlayerId == p4.Id);
            bool passed = rohit != null && rohit.BattingPoints == 0;
            results.Add(new ScenarioResult
            {
                TestNumber = 8,
                TestName = "Zero balls faced (division by zero avoided)",
                Passed = passed,
                Message = passed ? "Division by zero prevented when balls faced is 0" : "Failed",
                SelectedPlayerName = res.SelectedPlayerName,
                TotalScore = res.TotalScore
            });
        }

        // SCENARIO 9: Zero overs bowled (Economy division by zero protection)
        {
            var match = CreateMatch(1);
            var inn1 = new MatchInnings
            {
                Id = 1,
                MatchId = match.Id,
                InningsNumber = 1,
                TeamId = 1,
                BattingPerformances = new List<MatchBattingPerformance>(),
                BowlingPerformances = new List<MatchBowlingPerformance>
                {
                    new() { PlayerId = p5.Id, Player = p5, BallsBowled = 0, RunsConceded = 0, Wickets = 0, MaidenOvers = 0 }
                }
            };
            match.Innings.Add(inn1);

            var res = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            var rashid = res.Leaderboard.FirstOrDefault(x => x.PlayerId == p5.Id);
            bool passed = rashid != null && rashid.BowlingPoints == 0;
            results.Add(new ScenarioResult
            {
                TestNumber = 9,
                TestName = "Zero overs bowled (division by zero avoided)",
                Passed = passed,
                Message = passed ? "Division by zero prevented when balls bowled is 0" : "Failed",
                SelectedPlayerName = res.SelectedPlayerName,
                TotalScore = res.TotalScore
            });
        }

        // SCENARIO 10: Not-out innings handled properly
        {
            var match = CreateMatch(1);
            var inn1 = new MatchInnings
            {
                Id = 1,
                MatchId = match.Id,
                InningsNumber = 1,
                TeamId = 1,
                BattingPerformances = new List<MatchBattingPerformance>
                {
                    // Kohli: 60* not out (30 balls, 6 fours, 2 sixes)
                    new() { PlayerId = p1.Id, Player = p1, Runs = 60, BallsFaced = 30, Fours = 6, Sixes = 2, IsOut = false }
                },
                BowlingPerformances = new List<MatchBowlingPerformance>()
            };
            match.Innings.Add(inn1);

            var res = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            var kohli = res.Leaderboard.FirstOrDefault(x => x.PlayerId == p1.Id);
            bool passed = kohli != null && !kohli.IsOut && (kohli.BattingSummary.Contains("*") || kohli.BattingSummary.Contains("not out"));
            results.Add(new ScenarioResult
            {
                TestNumber = 10,
                TestName = "Not-out innings handled properly",
                Passed = passed,
                Message = passed ? $"Not-out displayed in summary correctly: {kohli?.BattingSummary}" : "Failed",
                SelectedPlayerName = res.SelectedPlayerName,
                TotalScore = res.TotalScore
            });
        }

        // SCENARIO 11: 5-wicket haul milestone (+20 pts)
        {
            var match = CreateMatch(null);
            var inn1 = new MatchInnings
            {
                Id = 1,
                MatchId = match.Id,
                InningsNumber = 1,
                TeamId = 1,
                BattingPerformances = new List<MatchBattingPerformance>(),
                BowlingPerformances = new List<MatchBowlingPerformance>
                {
                    // Bumrah: 5 wickets for 20 runs in 4 overs (24 balls, Econ 5.0 -> +15 pts)
                    // Bowling pts: 5*20 (100) + Milestone 5-wkt (+20) + Econ <= 5 (+15) = 135 pts
                    new() { PlayerId = p2.Id, Player = p2, BallsBowled = 24, RunsConceded = 20, Wickets = 5, MaidenOvers = 0 }
                }
            };
            match.Innings.Add(inn1);

            var res = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            var bumrah = res.Leaderboard.FirstOrDefault(x => x.PlayerId == p2.Id);
            bool passed = bumrah != null && bumrah.BowlingPoints == 135;
            results.Add(new ScenarioResult
            {
                TestNumber = 11,
                TestName = "5-wicket haul milestone (+20 bonus)",
                Passed = passed,
                Message = passed ? $"5-wicket milestone points awarded correctly (Total Bowling Points: {bumrah?.BowlingPoints})" : $"Failed: expected 135, got {bumrah?.BowlingPoints}",
                SelectedPlayerName = res.SelectedPlayerName,
                TotalScore = res.TotalScore
            });
        }

        // SCENARIO 12: Century milestone (+25 pts)
        {
            var match = CreateMatch(null);
            var inn1 = new MatchInnings
            {
                Id = 1,
                MatchId = match.Id,
                InningsNumber = 1,
                TeamId = 1,
                BattingPerformances = new List<MatchBattingPerformance>
                {
                    // Kohli: 102 runs, 60 balls, 10 fours, 4 sixes (SR 170 -> +15 pts)
                    // Batting pts: 102 (runs) + 10 (fours) + 8 (4*2 sixes) + 15 (SR) + 25 (Century) = 160 pts
                    new() { PlayerId = p1.Id, Player = p1, Runs = 102, BallsFaced = 60, Fours = 10, Sixes = 4, IsOut = true }
                },
                BowlingPerformances = new List<MatchBowlingPerformance>()
            };
            match.Innings.Add(inn1);

            var res = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            var kohli = res.Leaderboard.FirstOrDefault(x => x.PlayerId == p1.Id);
            bool passed = kohli != null && kohli.BattingPoints == 160;
            results.Add(new ScenarioResult
            {
                TestNumber = 12,
                TestName = "Century milestone (+25 bonus)",
                Passed = passed,
                Message = passed ? $"Century milestone bonus (+25) awarded correctly (Total Batting Points: {kohli?.BattingPoints})" : $"Failed: expected 160, got {kohli?.BattingPoints}",
                SelectedPlayerName = res.SelectedPlayerName,
                TotalScore = res.TotalScore
            });
        }

        // SCENARIO 13: Match finalized twice (idempotency)
        {
            var match = CreateMatch(1);
            var inn1 = new MatchInnings
            {
                Id = 1,
                MatchId = match.Id,
                InningsNumber = 1,
                TeamId = 1,
                BattingPerformances = new List<MatchBattingPerformance>
                {
                    new() { PlayerId = p1.Id, Player = p1, Runs = 70, BallsFaced = 40, Fours = 6, Sixes = 2, IsOut = true }
                },
                BowlingPerformances = new List<MatchBowlingPerformance>()
            };
            match.Innings.Add(inn1);

            var res1 = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            var res2 = ManOfTheMatchCalculator.Calculate(match, allPlayers);

            bool passed = res1.SelectedPlayerId == res2.SelectedPlayerId &&
                          res1.TotalScore == res2.TotalScore &&
                          res1.Leaderboard.Count == res2.Leaderboard.Count;
            results.Add(new ScenarioResult
            {
                TestNumber = 13,
                TestName = "Match finalized twice (idempotency)",
                Passed = passed,
                Message = passed ? "Calculation is 100% idempotent and deterministic" : "Failed",
                SelectedPlayerName = res2.SelectedPlayerName,
                TotalScore = res2.TotalScore
            });
        }

        // SCENARIO 14: Match reopened and statistics change
        {
            var match = CreateMatch(1);
            var perf1 = new MatchBattingPerformance { PlayerId = p1.Id, Player = p1, Runs = 40, BallsFaced = 30, Fours = 3, Sixes = 0, IsOut = true };
            var perf4 = new MatchBattingPerformance { PlayerId = p4.Id, Player = p4, Runs = 30, BallsFaced = 20, Fours = 2, Sixes = 0, IsOut = true };
            var inn1 = new MatchInnings
            {
                Id = 1,
                MatchId = match.Id,
                InningsNumber = 1,
                TeamId = 1,
                BattingPerformances = new List<MatchBattingPerformance> { perf1, perf4 },
                BowlingPerformances = new List<MatchBowlingPerformance>()
            };
            match.Innings.Add(inn1);

            var resInitial = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            int initialWinner = resInitial.SelectedPlayerId ?? 0;

            // Now match statistics change: Rohit scores 50 more runs
            perf4.Runs = 80;
            perf4.BallsFaced = 40;
            perf4.Fours = 8;
            perf4.Sixes = 3;

            var resUpdated = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            bool passed = initialWinner == p1.Id && resUpdated.SelectedPlayerId == p4.Id;
            results.Add(new ScenarioResult
            {
                TestNumber = 14,
                TestName = "Match reopened and statistics change",
                Passed = passed,
                Message = passed ? $"Winner updated dynamically from Player {initialWinner} to Player {resUpdated.SelectedPlayerId}" : "Failed",
                SelectedPlayerName = resUpdated.SelectedPlayerName,
                TotalScore = resUpdated.TotalScore
            });
        }

        // SCENARIO 15: No valid player performance exists
        {
            var match = CreateMatch(null);
            // No innings or empty performances
            var res = ManOfTheMatchCalculator.Calculate(match, allPlayers);
            bool passed = res.SelectedPlayerId == null && res.TotalScore == 0 && res.Leaderboard.Count == 0;
            results.Add(new ScenarioResult
            {
                TestNumber = 15,
                TestName = "No valid player performance exists",
                Passed = passed,
                Message = passed ? "Gracefully returned null player and zero score with empty leaderboard" : "Failed",
                SelectedPlayerName = res.SelectedPlayerName,
                TotalScore = res.TotalScore
            });
        }

        int passedCount = results.Count(r => r.Passed);
        int failedCount = results.Count(r => !r.Passed);

        return Ok(new
        {
            overallStatus = failedCount == 0 ? "PASSED" : "FAILED",
            passedCount,
            failedCount,
            totalScenarios = results.Count,
            results
        });
    }
}
