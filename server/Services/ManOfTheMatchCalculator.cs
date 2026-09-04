namespace CricketApp.Api.Services;

using CricketApp.Api.DTOs;
using CricketApp.Api.Models;

public static class ManOfTheMatchCalculator
{
    public static MomCalculationResultDto Calculate(Match match, List<Player> matchPlayers)
    {
        var result = new MomCalculationResultDto();

        if (match == null || match.Innings == null || match.Innings.Count == 0)
        {
            return result;
        }

        // Aggregate performances per player across all match innings
        var allBatting = match.Innings.SelectMany(i => i.BattingPerformances).ToList();
        var allBowling = match.Innings.SelectMany(i => i.BowlingPerformances).ToList();

        // Collect all distinct player IDs who have records in this match, plus match roster players
        var playerMap = new Dictionary<int, Player>();
        foreach (var p in matchPlayers)
        {
            playerMap[p.Id] = p;
        }

        foreach (var bp in allBatting)
        {
            if (bp.Player != null && !playerMap.ContainsKey(bp.PlayerId))
            {
                playerMap[bp.PlayerId] = bp.Player;
            }
        }

        foreach (var bowl in allBowling)
        {
            if (bowl.Player != null && !playerMap.ContainsKey(bowl.PlayerId))
            {
                playerMap[bowl.PlayerId] = bowl.Player;
            }
        }

        var leaderboard = new List<PlayerMomScoreDto>();

        foreach (var kvp in playerMap)
        {
            int playerId = kvp.Key;
            var player = kvp.Value;

            // Player team identification
            int playerTeamId = 0;
            string teamName = "Unknown";
            var teamPlayer = player.TeamPlayers?.FirstOrDefault(tp => tp.TeamId == match.Team1Id || tp.TeamId == match.Team2Id);
            if (teamPlayer != null)
            {
                playerTeamId = teamPlayer.TeamId;
                teamName = teamPlayer.Team?.Name ?? (playerTeamId == match.Team1Id ? match.Team1?.Name : match.Team2?.Name) ?? "Team";
            }
            else
            {
                // Infer from innings team
                var batInn = allBatting.FirstOrDefault(b => b.PlayerId == playerId)?.MatchInnings;
                if (batInn != null)
                {
                    playerTeamId = batInn.TeamId;
                    teamName = batInn.Team?.Name ?? (playerTeamId == match.Team1Id ? match.Team1?.Name : match.Team2?.Name) ?? "Team";
                }
                else
                {
                    var bowlInn = allBowling.FirstOrDefault(b => b.PlayerId == playerId)?.MatchInnings;
                    if (bowlInn != null)
                    {
                        playerTeamId = bowlInn.TeamId == match.Team1Id ? match.Team2Id : match.Team1Id;
                        teamName = playerTeamId == match.Team1Id ? (match.Team1?.Name ?? "Team 1") : (match.Team2?.Name ?? "Team 2");
                    }
                }
            }

            // Batting stats
            var playerBatting = allBatting.Where(b => b.PlayerId == playerId).ToList();
            int runs = playerBatting.Sum(b => b.Runs);
            int ballsFaced = playerBatting.Sum(b => b.BallsFaced);
            int fours = playerBatting.Sum(b => b.Fours);
            int sixes = playerBatting.Sum(b => b.Sixes);
            bool isOut = playerBatting.Any(b => b.IsOut);
            bool hasBatted = playerBatting.Count > 0 && (ballsFaced > 0 || runs > 0 || isOut);

            double strikeRate = ballsFaced > 0 ? Math.Round((runs * 100.0) / ballsFaced, 2) : 0.0;

            // Bowling stats
            var playerBowling = allBowling.Where(b => b.PlayerId == playerId).ToList();
            int wickets = playerBowling.Sum(b => b.Wickets);
            int ballsBowled = playerBowling.Sum(b => b.BallsBowled);
            int runsConceded = playerBowling.Sum(b => b.RunsConceded);
            int maidens = playerBowling.Sum(b => b.MaidenOvers);
            bool hasBowled = playerBowling.Count > 0 && ballsBowled > 0;

            double economyRate = ballsBowled > 0 ? Math.Round((runsConceded * 6.0) / ballsBowled, 2) : 0.0;
            string oversDisplay = CricketCalculationHelper.ToCricketOvers(ballsBowled);

            // 1. Calculate Batting Points
            double battingPoints = 0.0;
            if (hasBatted)
            {
                // Base runs
                battingPoints += runs * 1.0;

                // Boundary points: +1 per four, +2 per six
                battingPoints += (fours * 1.0) + (sixes * 2.0);

                // Strike rate bonus (minimum 5 balls faced or at least 10 runs)
                if (ballsFaced >= 5 || runs >= 10)
                {
                    if (strikeRate >= 150.0)
                    {
                        battingPoints += 15.0;
                    }
                    else if (strikeRate >= 125.0)
                    {
                        battingPoints += 10.0;
                    }
                    else if (strikeRate >= 100.0)
                    {
                        battingPoints += 5.0;
                    }
                }

                // Major innings milestone bonus (highest tier applied)
                if (runs >= 100)
                {
                    battingPoints += 25.0;
                }
                else if (runs >= 75)
                {
                    battingPoints += 15.0;
                }
                else if (runs >= 50)
                {
                    battingPoints += 10.0;
                }
            }

            // 2. Calculate Bowling Points
            double bowlingPoints = 0.0;
            if (hasBowled)
            {
                // 20 points per wicket
                bowlingPoints += wickets * 20.0;

                // Wicket milestone bonus (highest tier applied)
                if (wickets >= 5)
                {
                    bowlingPoints += 20.0;
                }
                else if (wickets == 4)
                {
                    bowlingPoints += 15.0;
                }
                else if (wickets == 3)
                {
                    bowlingPoints += 10.0;
                }

                // Economy bonus (only if at least 6 legal balls bowled)
                if (ballsBowled >= 6)
                {
                    if (economyRate <= 5.0)
                    {
                        bowlingPoints += 15.0;
                    }
                    else if (economyRate <= 7.0)
                    {
                        bowlingPoints += 10.0;
                    }
                    else if (economyRate <= 9.0)
                    {
                        bowlingPoints += 5.0;
                    }
                }

                // Maiden overs bonus
                bowlingPoints += maidens * 5.0;
            }

            // 3. All-Rounder Bonus
            double allRounderBonus = 0.0;
            if (runs >= 50 && wickets >= 2)
            {
                allRounderBonus = 20.0;
            }
            else if (runs >= 30 && wickets >= 2)
            {
                allRounderBonus = 15.0;
            }
            else if (runs >= 20 && wickets >= 1)
            {
                allRounderBonus = 10.0;
            }

            // 4. Winning Team Bonus
            double winningBonus = 0.0;
            if (match.WinningTeamId.HasValue && match.WinningTeamId.Value > 0 && playerTeamId == match.WinningTeamId.Value)
            {
                winningBonus = 5.0;
            }

            double totalScore = Math.Round(battingPoints + bowlingPoints + allRounderBonus + winningBonus, 2);

            // Construct Batting Summary
            string batSummary = hasBatted
                ? $"{runs}{(isOut ? "" : "*")} ({ballsFaced} balls), {fours}x4, {sixes}x6, SR: {strikeRate}{(isOut ? "" : " (not out)")}"
                : "Did not bat";

            // Construct Bowling Summary
            string bowlSummary = hasBowled
                ? $"{wickets} wicket{(wickets == 1 ? "" : "s")}, {runsConceded} runs, {oversDisplay} ov, Econ: {economyRate}"
                : "Did not bowl";

            bool hasContribution = (runs > 0 || ballsFaced > 0 || wickets > 0 || ballsBowled > 0);

            leaderboard.Add(new PlayerMomScoreDto
            {
                PlayerId = playerId,
                PlayerName = $"{player.FirstName} {player.LastName}".Trim(),
                TeamId = playerTeamId,
                TeamName = teamName,
                TotalScore = totalScore,
                BattingPoints = battingPoints,
                BowlingPoints = bowlingPoints,
                AllRounderBonus = allRounderBonus,
                WinningTeamBonus = winningBonus,
                Runs = runs,
                BallsFaced = ballsFaced,
                Fours = fours,
                Sixes = sixes,
                IsOut = isOut,
                StrikeRate = strikeRate,
                Wickets = wickets,
                BallsBowled = ballsBowled,
                OversDisplay = oversDisplay,
                RunsConceded = runsConceded,
                EconomyRate = economyRate,
                Maidens = maidens,
                BattingSummary = batSummary,
                BowlingSummary = bowlSummary,
                HasContribution = hasContribution
            });
        }

        // Rank leaderboard according to deterministic tie-breaker hierarchy:
        // 1. Higher total performance score
        // 2. Higher wickets
        // 3. Higher runs
        // 4. Better bowling economy (lower is better, if bowled)
        // 5. Better strike rate
        // 6. Deterministic player ID (lower first)
        var ranked = leaderboard
            .OrderByDescending(p => p.TotalScore)
            .ThenByDescending(p => p.Wickets)
            .ThenByDescending(p => p.Runs)
            .ThenBy(p => p.BallsBowled > 0 ? p.EconomyRate : 999.0)
            .ThenByDescending(p => p.StrikeRate)
            .ThenBy(p => p.PlayerId)
            .ToList();

        for (int i = 0; i < ranked.Count; i++)
        {
            ranked[i].Rank = i + 1;
        }

        result.Leaderboard = ranked;

        // Choose winner from players who have meaningful contribution and positive score
        var winner = ranked.FirstOrDefault(p => p.HasContribution && p.TotalScore > 0);
        if (winner != null)
        {
            result.SelectedPlayerId = winner.PlayerId;
            result.SelectedPlayerName = winner.PlayerName;
            result.SelectedPlayerTeamName = winner.TeamName;
            result.TotalScore = winner.TotalScore;
            result.BattingPoints = winner.BattingPoints;
            result.BowlingPoints = winner.BowlingPoints;
            result.AllRounderBonus = winner.AllRounderBonus;
            result.WinningTeamBonus = winner.WinningTeamBonus;
            result.BattingSummary = winner.BattingSummary;
            result.BowlingSummary = winner.BowlingSummary;
        }

        return result;
    }
}
