using CricketApp.Api.Data;
using CricketApp.Api.DTOs;
using CricketApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Services;

public interface IScorecardService
{
    Task<ScorecardDto?> GetScorecardAsync(int matchId);
    Task<ScorecardDto?> SaveScorecardAsync(int matchId, SaveScorecardRequest request);
}

public class ScorecardService : IScorecardService
{
    private readonly CricketDbContext _context;

    public ScorecardService(CricketDbContext context)
    {
        _context = context;
    }

    public async Task<ScorecardDto?> GetScorecardAsync(int matchId)
    {
        var match = await _context.Matches
            .Include(m => m.Series)
            .Include(m => m.Team1)
            .Include(m => m.Team2)
            .Include(m => m.WinningTeam)
            .Include(m => m.MOMPlayer)
            .Include(m => m.Innings)
                .ThenInclude(i => i.Team)
            .Include(m => m.Innings)
                .ThenInclude(i => i.BattingPerformances)
                    .ThenInclude(bp => bp.Player)
            .Include(m => m.Innings)
                .ThenInclude(i => i.BowlingPerformances)
                    .ThenInclude(bowl => bowl.Player)
            .FirstOrDefaultAsync(m => m.Id == matchId);

        if (match == null) return null;

        var matchDto = new MatchDto
        {
            Id = match.Id,
            SeriesId = match.SeriesId,
            SeriesName = match.Series.Name,
            Team1Id = match.Team1Id,
            Team1Name = match.Team1.Name,
            Team1ShortName = match.Team1.ShortName,
            Team2Id = match.Team2Id,
            Team2Name = match.Team2.Name,
            Team2ShortName = match.Team2.ShortName,
            MatchOrder = match.MatchOrder,
            RequiredOvers = match.RequiredOvers,
            ScheduledDate = match.ScheduledDate,
            ScheduledTime = match.ScheduledTime,
            Address = match.Address,
            Status = match.Status,
            WinningTeamId = match.WinningTeamId,
            WinningTeamName = match.WinningTeam?.Name,
            Result = match.Result,
            MOMPlayerId = match.MOMPlayerId,
            MOMPlayerName = match.MOMPlayer != null ? $"{match.MOMPlayer.FirstName} {match.MOMPlayer.LastName}" : null
        };

        var inn1 = match.Innings.FirstOrDefault(i => i.InningsNumber == 1);
        var inn2 = match.Innings.FirstOrDefault(i => i.InningsNumber == 2);

        return new ScorecardDto
        {
            Match = matchDto,
            Innings1 = MapInningsDto(inn1),
            Innings2 = MapInningsDto(inn2)
        };
    }

    private static InningsScorecardDto? MapInningsDto(MatchInnings? inn)
    {
        if (inn == null) return null;

        return new InningsScorecardDto
        {
            Id = inn.Id,
            MatchId = inn.MatchId,
            TeamId = inn.TeamId,
            TeamName = inn.Team?.Name ?? string.Empty,
            InningsNumber = inn.InningsNumber,
            Runs = inn.Runs,
            Wickets = inn.Wickets,
            Balls = inn.Balls,
            OversDisplay = CricketCalculationHelper.ToCricketOvers(inn.Balls),
            Status = inn.Status,
            BattingPerformances = inn.BattingPerformances.Select(bp => new BattingRecordDto
            {
                Id = bp.Id,
                PlayerId = bp.PlayerId,
                PlayerName = $"{bp.Player?.FirstName} {bp.Player?.LastName}",
                Runs = bp.Runs,
                BallsFaced = bp.BallsFaced,
                Fours = bp.Fours,
                Sixes = bp.Sixes,
                DotBalls = bp.DotBalls,
                Ones = bp.Ones,
                Twos = bp.Twos,
                Threes = bp.Threes,
                Fives = bp.Fives,
                SixRunBalls = bp.SixRunBalls,
                IsOut = bp.IsOut,
                DismissalType = bp.DismissalType,
                Bowled = bp.Bowled,
                SixInRowCount = bp.SixInRowCount,
                FourInRowCount = bp.FourInRowCount,
                StrikeRate = CricketCalculationHelper.CalculateStrikeRate(bp.Runs, bp.BallsFaced)
            }).ToList(),
            BowlingPerformances = inn.BowlingPerformances.Select(bowl => new BowlingRecordDto
            {
                Id = bowl.Id,
                PlayerId = bowl.PlayerId,
                PlayerName = $"{bowl.Player?.FirstName} {bowl.Player?.LastName}",
                BallsBowled = bowl.BallsBowled,
                OversDisplay = CricketCalculationHelper.ToCricketOvers(bowl.BallsBowled),
                RunsConceded = bowl.RunsConceded,
                Wickets = bowl.Wickets,
                MaidenOvers = bowl.MaidenOvers,
                HatTricks = bowl.HatTricks,
                Wides = bowl.Wides,
                NoBalls = bowl.NoBalls,
                EconomyRate = CricketCalculationHelper.CalculateEconomyRate(bowl.RunsConceded, bowl.BallsBowled)
            }).ToList()
        };
    }

    public async Task<ScorecardDto?> SaveScorecardAsync(int matchId, SaveScorecardRequest request)
    {
        var match = await _context.Matches
            .Include(m => m.Innings)
                .ThenInclude(i => i.BattingPerformances)
            .Include(m => m.Innings)
                .ThenInclude(i => i.BowlingPerformances)
            .FirstOrDefaultAsync(m => m.Id == matchId);

        if (match == null) return null;

        // Process Innings 1
        if (request.Innings1 != null)
        {
            await UpsertInningsAsync(match, 1, request.Innings1);
        }

        // Process Innings 2
        if (request.Innings2 != null)
        {
            await UpsertInningsAsync(match, 2, request.Innings2);
        }

        match.WinningTeamId = request.WinningTeamId;
        match.Result = request.Result;
        match.MOMPlayerId = request.MOMPlayerId;
        match.Status = request.Status;
        match.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetScorecardAsync(matchId);
    }

    private async Task UpsertInningsAsync(Match match, int inningsNumber, SaveInningsRequest req)
    {
        var inn = match.Innings.FirstOrDefault(i => i.InningsNumber == inningsNumber);
        if (inn == null)
        {
            inn = new MatchInnings
            {
                MatchId = match.Id,
                InningsNumber = inningsNumber,
                TeamId = req.TeamId,
                Runs = req.Runs,
                Wickets = req.Wickets,
                Balls = req.Balls,
                Status = req.Status
            };
            await _context.MatchInnings.AddAsync(inn);
            await _context.SaveChangesAsync();
        }
        else
        {
            inn.TeamId = req.TeamId;
            inn.Runs = req.Runs;
            inn.Wickets = req.Wickets;
            inn.Balls = req.Balls;
            inn.Status = req.Status;

            // Remove existing performances and re-add updated
            _context.MatchBattingPerformances.RemoveRange(inn.BattingPerformances);
            _context.MatchBowlingPerformances.RemoveRange(inn.BowlingPerformances);
            await _context.SaveChangesAsync();
        }

        // Add Batting performances
        foreach (var bpReq in req.BattingPerformances)
        {
            var bp = new MatchBattingPerformance
            {
                MatchInningsId = inn.Id,
                PlayerId = bpReq.PlayerId,
                Runs = bpReq.Runs,
                BallsFaced = bpReq.BallsFaced,
                Fours = bpReq.Fours,
                Sixes = bpReq.Sixes,
                DotBalls = bpReq.DotBalls,
                Ones = bpReq.Ones,
                Twos = bpReq.Twos,
                Threes = bpReq.Threes,
                Fives = bpReq.Fives,
                SixRunBalls = bpReq.SixRunBalls,
                IsOut = bpReq.IsOut,
                DismissalType = bpReq.DismissalType,
                Bowled = bpReq.Bowled,
                SixInRowCount = bpReq.SixInRowCount,
                FourInRowCount = bpReq.FourInRowCount
            };
            await _context.MatchBattingPerformances.AddAsync(bp);
        }

        // Add Bowling performances
        foreach (var bowlReq in req.BowlingPerformances)
        {
            var bowl = new MatchBowlingPerformance
            {
                MatchInningsId = inn.Id,
                PlayerId = bowlReq.PlayerId,
                BallsBowled = bowlReq.BallsBowled,
                RunsConceded = bowlReq.RunsConceded,
                Wickets = bowlReq.Wickets,
                MaidenOvers = bowlReq.MaidenOvers,
                HatTricks = bowlReq.HatTricks,
                Wides = bowlReq.Wides,
                NoBalls = bowlReq.NoBalls
            };
            await _context.MatchBowlingPerformances.AddAsync(bowl);
        }
    }
}
