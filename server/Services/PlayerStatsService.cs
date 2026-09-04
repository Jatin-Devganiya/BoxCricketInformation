using CricketApp.Api.Data;
using CricketApp.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Services;

public interface IPlayerStatsService
{
    Task<PlayerStatisticsDto?> GetPlayerStatisticsAsync(int playerId);
}

public class PlayerStatsService : IPlayerStatsService
{
    private readonly CricketDbContext _context;

    public PlayerStatsService(CricketDbContext context)
    {
        _context = context;
    }

    public async Task<PlayerStatisticsDto?> GetPlayerStatisticsAsync(int playerId)
    {
        var player = await _context.Players
            .FirstOrDefaultAsync(p => p.Id == playerId);

        if (player == null) return null;

        var battingRecords = await _context.MatchBattingPerformances
            .Include(b => b.MatchInnings)
            .Where(b => b.PlayerId == playerId)
            .ToListAsync();

        var bowlingRecords = await _context.MatchBowlingPerformances
            .Include(b => b.MatchInnings)
            .Where(b => b.PlayerId == playerId)
            .ToListAsync();

        // Calculate Batting
        int battingMatches = battingRecords.Select(b => b.MatchInnings.MatchId).Distinct().Count();
        int battingInnings = battingRecords.Count;
        int totalRuns = battingRecords.Sum(b => b.Runs);
        int totalBallsFaced = battingRecords.Sum(b => b.BallsFaced);
        int highestScore = battingRecords.Count > 0 ? battingRecords.Max(b => b.Runs) : 0;
        int fours = battingRecords.Sum(b => b.Fours);
        int sixes = battingRecords.Sum(b => b.Sixes);
        int dotBalls = battingRecords.Sum(b => b.DotBalls);
        int zeroOuts = battingRecords.Count(b => b.Runs == 0 && b.IsOut);
        int ones = battingRecords.Sum(b => b.Ones);
        int twos = battingRecords.Sum(b => b.Twos);
        int threes = battingRecords.Sum(b => b.Threes);
        int fives = battingRecords.Sum(b => b.Fives);
        int sixRunBalls = battingRecords.Sum(b => b.SixRunBalls);
        int sixInRowCount = battingRecords.Sum(b => b.SixInRowCount);
        int fourInRowCount = battingRecords.Sum(b => b.FourInRowCount);
        int dismissals = battingRecords.Count(b => b.IsOut);

        double strikeRate = CricketCalculationHelper.CalculateStrikeRate(totalRuns, totalBallsFaced);

        // Calculate Bowling
        int bowlingMatches = bowlingRecords.Select(b => b.MatchInnings.MatchId).Distinct().Count();
        int bowlingInnings = bowlingRecords.Count;
        int totalBallsBowled = bowlingRecords.Sum(b => b.BallsBowled);
        int totalRunsConceded = bowlingRecords.Sum(b => b.RunsConceded);
        int totalWickets = bowlingRecords.Sum(b => b.Wickets);
        int maidenOvers = bowlingRecords.Sum(b => b.MaidenOvers);
        int hatTricks = bowlingRecords.Sum(b => b.HatTricks);
        int wides = bowlingRecords.Sum(b => b.Wides);
        int noBalls = bowlingRecords.Sum(b => b.NoBalls);

        double economyRate = CricketCalculationHelper.CalculateEconomyRate(totalRunsConceded, totalBallsBowled);
        string oversFormatted = CricketCalculationHelper.ToCricketOvers(totalBallsBowled);

        // Best Bowling Figures
        string highestWicketsStr = "0/0";
        if (bowlingRecords.Count > 0)
        {
            var bestBowling = bowlingRecords
                .OrderByDescending(b => b.Wickets)
                .ThenBy(b => b.RunsConceded)
                .First();
            highestWicketsStr = $"{bestBowling.Wickets}/{bestBowling.RunsConceded}";
        }

        // Fielding statistics from BallEvents
        int catches = await _context.BallEvents.CountAsync(b => b.FielderPlayerId == playerId && b.WicketType == "Caught");
        int stumpings = await _context.BallEvents.CountAsync(b => b.FielderPlayerId == playerId && b.WicketType == "Stumped");
        int runOuts = await _context.BallEvents.CountAsync(b => b.FielderPlayerId == playerId && b.WicketType == "RunOut");

        // Man of the Match awards count
        int manOfTheMatchCount = await _context.Matches.CountAsync(m => m.MOMPlayerId == playerId);

        return new PlayerStatisticsDto
        {
            PlayerId = player.Id,
            PlayerName = $"{player.FirstName} {player.LastName}",
            PlayerCategory = player.PlayerCategory,
            ManOfTheMatchCount = manOfTheMatchCount,
            Batting = new BattingStatsDto
            {
                Matches = battingMatches,
                Innings = battingInnings,
                TotalRuns = totalRuns,
                BallsFaced = totalBallsFaced,
                TotalBallsPlayed = totalBallsFaced,
                HighestScore = highestScore,
                RunRate = strikeRate,
                Fours = fours,
                Sixes = sixes,
                DotBalls = dotBalls,
                ZeroOutCount = zeroOuts,
                Ones = ones,
                Twos = twos,
                Threes = threes,
                Fives = fives,
                SixRunBalls = sixRunBalls,
                SixInRowCount = sixInRowCount,
                FourInRowCount = fourInRowCount,
                Dismissals = dismissals
            },
            Bowling = new BowlingStatsDto
            {
                Matches = bowlingMatches,
                Innings = bowlingInnings,
                BallsBowled = totalBallsBowled,
                OversFormatted = oversFormatted,
                RunsConceded = totalRunsConceded,
                Wickets = totalWickets,
                EconomyRate = economyRate,
                HighestWickets = highestWicketsStr,
                MaidenOvers = maidenOvers,
                HatTricks = hatTricks,
                Wides = wides,
                NoBalls = noBalls
            },
            Fielding = new FieldingStatsDto
            {
                Catches = catches,
                Stumpings = stumpings,
                RunOuts = runOuts
            }
        };
    }
}
