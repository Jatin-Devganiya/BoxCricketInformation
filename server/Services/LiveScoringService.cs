using CricketApp.Api.Data;
using CricketApp.Api.DTOs;
using CricketApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Services;

public interface ILiveScoringService
{
    Task<LiveScoreDto?> GetLiveScoreAsync(int matchId);
    Task<LiveScoreDto?> StartInningsAsync(int matchId, StartInningsRequest request);
    Task<LiveScoreDto?> RecordBallAsync(int matchId, int inningsId, RecordBallRequest request);
    Task<LiveScoreDto?> RecordWicketAsync(int matchId, int inningsId, RecordWicketRequest request);
    Task<LiveScoreDto?> SelectNewBatsmanAsync(int matchId, int inningsId, SelectNewBatsmanRequest request);
    Task<LiveScoreDto?> NextOverAsync(int matchId, int inningsId, NextOverRequest request);
    Task<LiveScoreDto?> CompleteInningsAsync(int matchId, int inningsId);
    Task<LiveScoreDto?> CompleteMatchAsync(int matchId, CompleteMatchRequest request);
}

public class LiveScoringService : ILiveScoringService
{
    private readonly CricketDbContext _context;

    public LiveScoringService(CricketDbContext context)
    {
        _context = context;
    }

    public async Task<LiveScoreDto?> GetLiveScoreAsync(int matchId)
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
                .ThenInclude(i => i.CurrentStriker)
            .Include(m => m.Innings)
                .ThenInclude(i => i.CurrentNonStriker)
            .Include(m => m.Innings)
                .ThenInclude(i => i.CurrentBowler)
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

        // Fetch BallEvents for both innings
        var inn1Events = inn1 != null
            ? await _context.BallEvents
                .Include(b => b.StrikerPlayer)
                .Include(b => b.NonStrikerPlayer)
                .Include(b => b.BowlerPlayer)
                .Include(b => b.DismissedPlayer)
                .Include(b => b.FielderPlayer)
                .Where(b => b.InningsId == inn1.Id)
                .OrderBy(b => b.Id)
                .ToListAsync()
            : new List<BallEvent>();

        var inn2Events = inn2 != null
            ? await _context.BallEvents
                .Include(b => b.StrikerPlayer)
                .Include(b => b.NonStrikerPlayer)
                .Include(b => b.BowlerPlayer)
                .Include(b => b.DismissedPlayer)
                .Include(b => b.FielderPlayer)
                .Where(b => b.InningsId == inn2.Id)
                .OrderBy(b => b.Id)
                .ToListAsync()
            : new List<BallEvent>();

        var inn1Dto = inn1 != null ? BuildLiveInningsDto(match, inn1, inn1Events, null) : null;
        var inn2Dto = inn2 != null ? BuildLiveInningsDto(match, inn2, inn2Events, inn1?.Runs) : null;

        int activeInningsNumber = 1;
        if (inn1 != null && inn1.Status == "Completed")
        {
            activeInningsNumber = 2;
        }
        else if (inn2 != null && inn2.Status == "InProgress")
        {
            activeInningsNumber = 2;
        }

        bool isMatchComplete = match.Status == "Completed" || match.Status == "Cancelled";

        string? summary = null;
        if (!string.IsNullOrWhiteSpace(match.Result))
        {
            summary = match.Result;
        }
        else if (inn1Dto != null && inn2Dto == null)
        {
            summary = $"{inn1Dto.BattingTeamName}: {inn1Dto.Runs}/{inn1Dto.Wickets} ({inn1Dto.OversDisplay} ov)";
        }
        else if (inn1Dto != null && inn2Dto != null)
        {
            summary = $"{inn1Dto.BattingTeamShortName}: {inn1Dto.Runs}/{inn1Dto.Wickets} vs {inn2Dto.BattingTeamShortName}: {inn2Dto.Runs}/{inn2Dto.Wickets}";
        }

        return new LiveScoreDto
        {
            Match = matchDto,
            ActiveInningsNumber = activeInningsNumber,
            Innings1 = inn1Dto,
            Innings2 = inn2Dto,
            IsInningsComplete = (activeInningsNumber == 1 ? inn1?.Status : inn2?.Status) == "Completed",
            IsMatchComplete = isMatchComplete,
            MatchSummary = summary
        };
    }

    private static LiveInningsDto BuildLiveInningsDto(Match match, MatchInnings inn, List<BallEvent> events, int? inn1Runs)
    {
        string battingTeamName = inn.Team?.Name ?? (inn.TeamId == match.Team1Id ? match.Team1.Name : match.Team2.Name);
        string battingShort = inn.Team?.ShortName ?? (inn.TeamId == match.Team1Id ? match.Team1.ShortName : match.Team2.ShortName);

        bool isTeam1Batting = inn.TeamId == match.Team1Id;
        string bowlingTeamName = isTeam1Batting ? match.Team2.Name : match.Team1.Name;
        string bowlingShort = isTeam1Batting ? match.Team2.ShortName : match.Team1.ShortName;
        int bowlingTeamId = isTeam1Batting ? match.Team2Id : match.Team1Id;

        // Current over deliveries
        int currentOverNumber = (inn.Balls / 6) + 1;
        if (inn.Balls > 0 && inn.Balls % 6 == 0 && events.Count > 0)
        {
            var lastEvent = events.Last();
            currentOverNumber = lastEvent.OverNumber;
        }

        var currentOverEvents = events
            .Where(e => e.OverNumber == currentOverNumber)
            .OrderBy(e => e.Id)
            .Select(MapBallEventDto)
            .ToList();

        int legalBallsInCurrentOver = events
            .Where(e => e.OverNumber == currentOverNumber && e.IsLegalBall)
            .Count();

        bool isOverComplete = legalBallsInCurrentOver >= 6 && inn.Balls > 0 && (inn.Balls % 6 == 0);

        bool requiresNewBatsman = (inn.CurrentStrikerId == null || inn.CurrentNonStrikerId == null) && inn.Status == "InProgress";
        int? lastDismissedId = events.LastOrDefault(e => e.IsWicket)?.DismissedPlayerId;

        // Active Striker stats
        LiveBatsmanDto? strikerDto = null;
        if (inn.CurrentStrikerId.HasValue)
        {
            var strikerEvents = events.Where(e => e.StrikerPlayerId == inn.CurrentStrikerId.Value).ToList();
            int runs = strikerEvents.Sum(e => e.BatRuns);
            int ballsFaced = strikerEvents.Count(e => e.EventType != "Wide");
            int fours = strikerEvents.Count(e => e.BatRuns == 4);
            int sixes = strikerEvents.Count(e => e.BatRuns == 6);
            int dots = strikerEvents.Count(e => e.BatRuns == 0 && e.IsLegalBall);
            int ones = strikerEvents.Count(e => e.BatRuns == 1);
            int twos = strikerEvents.Count(e => e.BatRuns == 2);
            int threes = strikerEvents.Count(e => e.BatRuns == 3);

            strikerDto = new LiveBatsmanDto
            {
                PlayerId = inn.CurrentStrikerId.Value,
                PlayerName = inn.CurrentStriker != null ? $"{inn.CurrentStriker.FirstName} {inn.CurrentStriker.LastName}" : "Striker",
                Runs = runs,
                BallsFaced = ballsFaced,
                Fours = fours,
                Sixes = sixes,
                DotBalls = dots,
                Ones = ones,
                Twos = twos,
                Threes = threes,
                StrikeRate = CricketCalculationHelper.CalculateStrikeRate(runs, ballsFaced),
                IsStriker = true
            };
        }

        // Active Non-Striker stats
        LiveBatsmanDto? nonStrikerDto = null;
        if (inn.CurrentNonStrikerId.HasValue)
        {
            var nonStrikerEvents = events.Where(e => e.StrikerPlayerId == inn.CurrentNonStrikerId.Value).ToList();
            int runs = nonStrikerEvents.Sum(e => e.BatRuns);
            int ballsFaced = nonStrikerEvents.Count(e => e.EventType != "Wide");
            int fours = nonStrikerEvents.Count(e => e.BatRuns == 4);
            int sixes = nonStrikerEvents.Count(e => e.BatRuns == 6);
            int dots = nonStrikerEvents.Count(e => e.BatRuns == 0 && e.IsLegalBall);
            int ones = nonStrikerEvents.Count(e => e.BatRuns == 1);
            int twos = nonStrikerEvents.Count(e => e.BatRuns == 2);
            int threes = nonStrikerEvents.Count(e => e.BatRuns == 3);

            nonStrikerDto = new LiveBatsmanDto
            {
                PlayerId = inn.CurrentNonStrikerId.Value,
                PlayerName = inn.CurrentNonStriker != null ? $"{inn.CurrentNonStriker.FirstName} {inn.CurrentNonStriker.LastName}" : "Non-Striker",
                Runs = runs,
                BallsFaced = ballsFaced,
                Fours = fours,
                Sixes = sixes,
                DotBalls = dots,
                Ones = ones,
                Twos = twos,
                Threes = threes,
                StrikeRate = CricketCalculationHelper.CalculateStrikeRate(runs, ballsFaced),
                IsStriker = false
            };
        }

        // Active Bowler stats
        LiveBowlerDto? bowlerDto = null;
        if (inn.CurrentBowlerId.HasValue)
        {
            var bowlerEvents = events.Where(e => e.BowlerPlayerId == inn.CurrentBowlerId.Value).ToList();
            int legalBalls = bowlerEvents.Count(e => e.IsLegalBall);
            int conceded = bowlerEvents.Sum(e => e.BatRuns + (e.ExtraType == "Wide" || e.ExtraType == "NoBall" ? e.ExtraRuns : 0));
            int wickets = bowlerEvents.Count(e => e.IsWicket && e.BowlerCreditedWicket);
            int wides = bowlerEvents.Count(e => e.ExtraType == "Wide");
            int noBalls = bowlerEvents.Count(e => e.ExtraType == "NoBall");

            int maidenCount = 0;
            var bowlerOvers = bowlerEvents.GroupBy(e => e.OverNumber);
            foreach (var ov in bowlerOvers)
            {
                if (ov.Count(e => e.IsLegalBall) == 6)
                {
                    int runsInOver = ov.Sum(e => e.BatRuns + (e.ExtraType == "Wide" || e.ExtraType == "NoBall" ? e.ExtraRuns : 0));
                    if (runsInOver == 0) maidenCount++;
                }
            }

            bowlerDto = new LiveBowlerDto
            {
                PlayerId = inn.CurrentBowlerId.Value,
                PlayerName = inn.CurrentBowler != null ? $"{inn.CurrentBowler.FirstName} {inn.CurrentBowler.LastName}" : "Bowler",
                BallsBowled = legalBalls,
                OversDisplay = CricketCalculationHelper.ToCricketOvers(legalBalls),
                RunsConceded = conceded,
                Wickets = wickets,
                MaidenOvers = maidenCount,
                Wides = wides,
                NoBalls = noBalls,
                EconomyRate = CricketCalculationHelper.CalculateEconomyRate(conceded, legalBalls)
            };
        }

        // Run rates
        double crr = CricketCalculationHelper.CalculateEconomyRate(inn.Runs, inn.Balls);
        int? target = inn1Runs.HasValue ? inn1Runs.Value + 1 : null;
        double? rrr = null;
        if (target.HasValue && inn.Status == "InProgress")
        {
            int requiredRuns = target.Value - inn.Runs;
            int totalMaxBalls = match.RequiredOvers * 6;
            int remainingBalls = Math.Max(0, totalMaxBalls - inn.Balls);
            if (remainingBalls > 0 && requiredRuns > 0)
            {
                rrr = Math.Round((double)requiredRuns / (remainingBalls / 6.0), 2);
            }
        }

        return new LiveInningsDto
        {
            Id = inn.Id,
            MatchId = inn.MatchId,
            InningsNumber = inn.InningsNumber,
            BattingTeamId = inn.TeamId,
            BattingTeamName = battingTeamName,
            BattingTeamShortName = battingShort,
            BowlingTeamId = bowlingTeamId,
            BowlingTeamName = bowlingTeamName,
            BowlingTeamShortName = bowlingShort,
            Runs = inn.Runs,
            Wickets = inn.Wickets,
            LegalBalls = inn.Balls,
            OversDisplay = CricketCalculationHelper.ToCricketOvers(inn.Balls),
            Extras = inn.Extras,
            Status = inn.Status,
            CurrentRunRate = crr,
            TargetRuns = target,
            RequiredRunRate = rrr,
            Striker = strikerDto,
            NonStriker = nonStrikerDto,
            CurrentBowler = bowlerDto,
            IsOverComplete = isOverComplete,
            RequiresNewBatsman = requiresNewBatsman,
            LastDismissedPlayerId = lastDismissedId,
            CurrentOverDeliveries = currentOverEvents,
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

    private static BallEventDto MapBallEventDto(BallEvent b)
    {
        string text;
        if (b.IsWicket)
        {
            text = "W";
        }
        else if (b.EventType == "Wide")
        {
            text = b.ExtraRuns > 1 ? $"{b.ExtraRuns}Wd" : "Wd";
        }
        else if (b.EventType == "NoBall")
        {
            text = b.BatRuns > 0 ? $"{b.BatRuns}Nb" : "Nb";
        }
        else if (b.EventType == "LegBye")
        {
            text = $"{b.ExtraRuns}Lb";
        }
        else if (b.EventType == "DeadBall")
        {
            text = "DB";
        }
        else
        {
            text = b.Runs.ToString();
        }

        return new BallEventDto
        {
            Id = b.Id,
            OverNumber = b.OverNumber,
            BallNumber = b.BallNumber,
            DeliveryNumber = b.DeliveryNumber,
            StrikerPlayerId = b.StrikerPlayerId,
            StrikerName = b.StrikerPlayer != null ? $"{b.StrikerPlayer.FirstName} {b.StrikerPlayer.LastName}" : "Striker",
            NonStrikerPlayerId = b.NonStrikerPlayerId,
            NonStrikerName = b.NonStrikerPlayer != null ? $"{b.NonStrikerPlayer.FirstName} {b.NonStrikerPlayer.LastName}" : "Non-Striker",
            BowlerPlayerId = b.BowlerPlayerId,
            BowlerName = b.BowlerPlayer != null ? $"{b.BowlerPlayer.FirstName} {b.BowlerPlayer.LastName}" : "Bowler",
            EventType = b.EventType,
            Runs = b.Runs,
            BatRuns = b.BatRuns,
            ExtraRuns = b.ExtraRuns,
            ExtraType = b.ExtraType,
            IsLegalBall = b.IsLegalBall,
            IsWicket = b.IsWicket,
            WicketType = b.WicketType,
            DismissedPlayerId = b.DismissedPlayerId,
            DismissedPlayerName = b.DismissedPlayer != null ? $"{b.DismissedPlayer.FirstName} {b.DismissedPlayer.LastName}" : null,
            FielderPlayerId = b.FielderPlayerId,
            FielderPlayerName = b.FielderPlayer != null ? $"{b.FielderPlayer.FirstName} {b.FielderPlayer.LastName}" : null,
            BowlerCreditedWicket = b.BowlerCreditedWicket,
            DisplayText = text,
            CreatedAt = b.CreatedAt
        };
    }

    public async Task<LiveScoreDto?> StartInningsAsync(int matchId, StartInningsRequest req)
    {
        var match = await _context.Matches
            .Include(m => m.Innings)
            .FirstOrDefaultAsync(m => m.Id == matchId);

        if (match == null) return null;

        if (req.StrikerPlayerId == req.NonStrikerPlayerId)
        {
            throw new InvalidOperationException("Striker and Non-Striker must be different players.");
        }

        var inn = match.Innings.FirstOrDefault(i => i.InningsNumber == req.InningsNumber);
        if (inn == null)
        {
            inn = new MatchInnings
            {
                MatchId = match.Id,
                InningsNumber = req.InningsNumber,
                TeamId = req.BattingTeamId,
                Runs = 0,
                Wickets = 0,
                Balls = 0,
                Extras = 0,
                Status = "InProgress",
                CurrentStrikerId = req.StrikerPlayerId,
                CurrentNonStrikerId = req.NonStrikerPlayerId,
                CurrentBowlerId = req.BowlerPlayerId
            };
            await _context.MatchInnings.AddAsync(inn);
        }
        else
        {
            inn.TeamId = req.BattingTeamId;
            inn.Status = "InProgress";
            inn.CurrentStrikerId = req.StrikerPlayerId;
            inn.CurrentNonStrikerId = req.NonStrikerPlayerId;
            inn.CurrentBowlerId = req.BowlerPlayerId;
        }

        match.Status = "InProgress";
        match.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetLiveScoreAsync(matchId);
    }

    public async Task<LiveScoreDto?> RecordBallAsync(int matchId, int inningsId, RecordBallRequest req)
    {
        var match = await _context.Matches
            .Include(m => m.Innings)
            .FirstOrDefaultAsync(m => m.Id == matchId);

        if (match == null) return null;

        var inn = await _context.MatchInnings
            .Include(i => i.BallEvents)
            .FirstOrDefaultAsync(i => i.Id == inningsId && i.MatchId == matchId);

        if (inn == null) return null;
        if (inn.Status != "InProgress")
        {
            throw new InvalidOperationException("Innings is not in progress.");
        }

        if (!inn.CurrentStrikerId.HasValue || !inn.CurrentNonStrikerId.HasValue || !inn.CurrentBowlerId.HasValue)
        {
            throw new InvalidOperationException("Striker, Non-Striker, and Bowler must all be set before recording a ball.");
        }

        bool isLegalBall = !(req.EventType == "NoBall" || req.EventType == "Wide" || req.EventType == "DeadBall");
        int batRuns = 0;
        int extraRuns = 0;
        string extraType = "None";

        switch (req.EventType)
        {
            case "Normal":
                batRuns = req.Runs;
                extraRuns = 0;
                extraType = "None";
                break;
            case "Wide":
                batRuns = 0;
                extraRuns = req.ExtraRuns > 0 ? req.ExtraRuns : (req.Runs > 0 ? req.Runs : 1);
                extraType = "Wide";
                break;
            case "NoBall":
                batRuns = req.BatRuns;
                extraRuns = req.ExtraRuns > 0 ? req.ExtraRuns : 1;
                extraType = "NoBall";
                break;
            case "LegBye":
                batRuns = 0;
                extraRuns = req.Runs > 0 ? req.Runs : 1;
                extraType = "LegBye";
                isLegalBall = true;
                break;
            case "DeadBall":
                batRuns = 0;
                extraRuns = 0;
                extraType = "None";
                isLegalBall = false;
                break;
            default:
                batRuns = req.Runs;
                extraRuns = 0;
                extraType = "None";
                break;
        }

        int totalDeliveryRuns = batRuns + extraRuns;

        int currentOverNumber = (inn.Balls / 6) + 1;
        int legalBallNumberInOver = isLegalBall ? (inn.Balls % 6) + 1 : (inn.Balls % 6);
        int deliveryNumberInOver = await _context.BallEvents
            .CountAsync(b => b.InningsId == inn.Id && b.OverNumber == currentOverNumber) + 1;

        if (isLegalBall)
        {
            inn.Balls += 1;
        }

        inn.Runs += totalDeliveryRuns;
        inn.Extras += extraRuns;

        var ballEvent = new BallEvent
        {
            MatchId = match.Id,
            InningsId = inn.Id,
            OverNumber = currentOverNumber,
            BallNumber = legalBallNumberInOver,
            DeliveryNumber = deliveryNumberInOver,
            StrikerPlayerId = inn.CurrentStrikerId.Value,
            NonStrikerPlayerId = inn.CurrentNonStrikerId.Value,
            BowlerPlayerId = inn.CurrentBowlerId.Value,
            EventType = req.EventType,
            Runs = totalDeliveryRuns,
            BatRuns = batRuns,
            ExtraRuns = extraRuns,
            ExtraType = extraType,
            IsLegalBall = isLegalBall,
            IsWicket = false,
            CreatedAt = DateTime.UtcNow
        };

        await _context.BallEvents.AddAsync(ballEvent);

        // Strike Rotation on odd runs
        int runsForRotation = (req.EventType == "LegBye" ? extraRuns : batRuns);
        if (runsForRotation % 2 != 0)
        {
            int temp = inn.CurrentStrikerId.Value;
            inn.CurrentStrikerId = inn.CurrentNonStrikerId.Value;
            inn.CurrentNonStrikerId = temp;
        }

        // End of Over Strike Rotation: at 6 legal balls, batsmen swap ends
        if (isLegalBall && inn.Balls % 6 == 0)
        {
            int temp = inn.CurrentStrikerId.Value;
            inn.CurrentStrikerId = inn.CurrentNonStrikerId.Value;
            inn.CurrentNonStrikerId = temp;
        }

        await _context.SaveChangesAsync();

        // Check Innings/Match completion
        await CheckInningsAndMatchCompletionAsync(match, inn);

        // Auto-synchronize Batting and Bowling Performance tables
        await SyncPerformancesFromEventsAsync(inn.Id);

        return await GetLiveScoreAsync(matchId);
    }

    public async Task<LiveScoreDto?> RecordWicketAsync(int matchId, int inningsId, RecordWicketRequest req)
    {
        var match = await _context.Matches
            .Include(m => m.Innings)
            .FirstOrDefaultAsync(m => m.Id == matchId);

        if (match == null) return null;

        var inn = await _context.MatchInnings
            .Include(i => i.BallEvents)
            .FirstOrDefaultAsync(i => i.Id == inningsId && i.MatchId == matchId);

        if (inn == null) return null;
        if (inn.Status != "InProgress")
        {
            throw new InvalidOperationException("Innings is not in progress.");
        }

        if (!inn.CurrentStrikerId.HasValue || !inn.CurrentNonStrikerId.HasValue || !inn.CurrentBowlerId.HasValue)
        {
            throw new InvalidOperationException("Striker, Non-Striker, and Bowler must all be set before recording a wicket.");
        }

        if (req.DismissedPlayerId != inn.CurrentStrikerId && req.DismissedPlayerId != inn.CurrentNonStrikerId)
        {
            throw new InvalidOperationException("Dismissed batsman must be currently at the crease (Striker or Non-Striker).");
        }

        bool bowlerCredited = (req.WicketType != "RunOut");
        int runs = req.RunsScored;
        inn.Runs += runs;

        int currentOverNumber = (inn.Balls / 6) + 1;
        int legalBallNumberInOver = (inn.Balls % 6) + 1;
        int deliveryNumberInOver = await _context.BallEvents
            .CountAsync(b => b.InningsId == inn.Id && b.OverNumber == currentOverNumber) + 1;

        inn.Balls += 1;
        inn.Wickets += 1;

        var ballEvent = new BallEvent
        {
            MatchId = match.Id,
            InningsId = inn.Id,
            OverNumber = currentOverNumber,
            BallNumber = legalBallNumberInOver,
            DeliveryNumber = deliveryNumberInOver,
            StrikerPlayerId = inn.CurrentStrikerId.Value,
            NonStrikerPlayerId = inn.CurrentNonStrikerId.Value,
            BowlerPlayerId = inn.CurrentBowlerId.Value,
            EventType = "Wicket",
            Runs = runs,
            BatRuns = req.WicketType == "RunOut" ? runs : 0,
            ExtraRuns = 0,
            ExtraType = "None",
            IsLegalBall = true,
            IsWicket = true,
            WicketType = req.WicketType,
            DismissedPlayerId = req.DismissedPlayerId,
            FielderPlayerId = req.FielderPlayerId,
            BowlerCreditedWicket = bowlerCredited,
            CreatedAt = DateTime.UtcNow
        };

        await _context.BallEvents.AddAsync(ballEvent);

        if (req.DismissedPlayerId == inn.CurrentStrikerId)
        {
            inn.CurrentStrikerId = null;
        }
        else
        {
            inn.CurrentNonStrikerId = null;
        }

        // If end of over occurred on this wicket ball
        if (inn.Balls % 6 == 0)
        {
            if (inn.CurrentNonStrikerId.HasValue)
            {
                inn.CurrentStrikerId = inn.CurrentNonStrikerId;
                inn.CurrentNonStrikerId = null;
            }
        }

        await _context.SaveChangesAsync();

        await CheckInningsAndMatchCompletionAsync(match, inn);

        await SyncPerformancesFromEventsAsync(inn.Id);

        return await GetLiveScoreAsync(matchId);
    }

    public async Task<LiveScoreDto?> SelectNewBatsmanAsync(int matchId, int inningsId, SelectNewBatsmanRequest req)
    {
        var inn = await _context.MatchInnings
            .Include(i => i.BallEvents)
            .FirstOrDefaultAsync(i => i.Id == inningsId && i.MatchId == matchId);

        if (inn == null) return null;

        bool alreadyOut = await _context.BallEvents
            .AnyAsync(b => b.InningsId == inn.Id && b.IsWicket && b.DismissedPlayerId == req.NewBatsmanPlayerId);

        if (alreadyOut)
        {
            throw new InvalidOperationException("Selected batsman has already been dismissed.");
        }

        if (inn.CurrentStrikerId == req.NewBatsmanPlayerId || inn.CurrentNonStrikerId == req.NewBatsmanPlayerId)
        {
            throw new InvalidOperationException("Selected batsman is already currently batting.");
        }

        if (!inn.CurrentStrikerId.HasValue)
        {
            inn.CurrentStrikerId = req.NewBatsmanPlayerId;
        }
        else if (!inn.CurrentNonStrikerId.HasValue)
        {
            inn.CurrentNonStrikerId = req.NewBatsmanPlayerId;
        }
        else
        {
            throw new InvalidOperationException("Both batting positions are already occupied.");
        }

        await _context.SaveChangesAsync();

        return await GetLiveScoreAsync(matchId);
    }

    public async Task<LiveScoreDto?> NextOverAsync(int matchId, int inningsId, NextOverRequest req)
    {
        var inn = await _context.MatchInnings
            .FirstOrDefaultAsync(i => i.Id == inningsId && i.MatchId == matchId);

        if (inn == null) return null;

        if (inn.Balls % 6 != 0 || inn.Balls == 0)
        {
            throw new InvalidOperationException("Current over is not yet complete (requires 6 legal balls).");
        }

        if (inn.CurrentBowlerId == req.NextBowlerPlayerId)
        {
            throw new InvalidOperationException("Consecutive overs by the same bowler are not allowed.");
        }

        inn.CurrentBowlerId = req.NextBowlerPlayerId;
        await _context.SaveChangesAsync();

        return await GetLiveScoreAsync(matchId);
    }

    public async Task<LiveScoreDto?> CompleteInningsAsync(int matchId, int inningsId)
    {
        var match = await _context.Matches
            .Include(m => m.Innings)
            .FirstOrDefaultAsync(m => m.Id == matchId);

        if (match == null) return null;

        var inn = match.Innings.FirstOrDefault(i => i.Id == inningsId);
        if (inn == null) return null;

        inn.Status = "Completed";

        if (inn.InningsNumber == 2)
        {
            var inn1 = match.Innings.FirstOrDefault(i => i.InningsNumber == 1);
            if (inn1 != null)
            {
                DetermineMatchWinnerAndResult(match, inn1, inn);
            }
            match.Status = "Completed";
        }

        match.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await SyncPerformancesFromEventsAsync(inn.Id);

        return await GetLiveScoreAsync(matchId);
    }

    public async Task<LiveScoreDto?> CompleteMatchAsync(int matchId, CompleteMatchRequest req)
    {
        var match = await _context.Matches
            .Include(m => m.Innings)
            .FirstOrDefaultAsync(m => m.Id == matchId);

        if (match == null) return null;

        if (req.WinningTeamId.HasValue && req.WinningTeamId > 0)
        {
            match.WinningTeamId = req.WinningTeamId;
        }

        if (!string.IsNullOrWhiteSpace(req.Result))
        {
            match.Result = req.Result;
        }

        if (req.MOMPlayerId.HasValue && req.MOMPlayerId > 0)
        {
            match.MOMPlayerId = req.MOMPlayerId;
        }

        match.Status = "Completed";
        match.UpdatedAt = DateTime.UtcNow;

        foreach (var inn in match.Innings)
        {
            if (inn.Status == "InProgress") inn.Status = "Completed";
            await SyncPerformancesFromEventsAsync(inn.Id);
        }

        await _context.SaveChangesAsync();

        return await GetLiveScoreAsync(matchId);
    }

    private async Task CheckInningsAndMatchCompletionAsync(Match match, MatchInnings inn)
    {
        int maxLegalBalls = match.RequiredOvers * 6;

        if (inn.InningsNumber == 1)
        {
            if (inn.Balls >= maxLegalBalls || inn.Wickets >= 10)
            {
                inn.Status = "Completed";
                await _context.SaveChangesAsync();
            }
        }
        else if (inn.InningsNumber == 2)
        {
            var inn1 = match.Innings.FirstOrDefault(i => i.InningsNumber == 1);
            if (inn1 != null)
            {
                if (inn.Runs > inn1.Runs)
                {
                    inn.Status = "Completed";
                    DetermineMatchWinnerAndResult(match, inn1, inn);
                    match.Status = "Completed";
                    await _context.SaveChangesAsync();
                }
                else if (inn.Balls >= maxLegalBalls || inn.Wickets >= 10)
                {
                    inn.Status = "Completed";
                    DetermineMatchWinnerAndResult(match, inn1, inn);
                    match.Status = "Completed";
                    await _context.SaveChangesAsync();
                }
            }
        }
    }

    private static void DetermineMatchWinnerAndResult(Match match, MatchInnings inn1, MatchInnings inn2)
    {
        if (inn2.Runs > inn1.Runs)
        {
            match.WinningTeamId = inn2.TeamId;
            int wicketsInHand = Math.Max(0, 10 - inn2.Wickets);
            match.Result = $"{inn2.Team?.Name ?? "Batting Team"} won by {wicketsInHand} wicket{(wicketsInHand == 1 ? "" : "s")}";
        }
        else if (inn1.Runs > inn2.Runs)
        {
            match.WinningTeamId = inn1.TeamId;
            int runDifference = inn1.Runs - inn2.Runs;
            match.Result = $"{inn1.Team?.Name ?? "First Batting Team"} won by {runDifference} run{(runDifference == 1 ? "" : "s")}";
        }
        else
        {
            match.WinningTeamId = null;
            match.Result = "Match Tied";
        }
    }

    private async Task SyncPerformancesFromEventsAsync(int inningsId)
    {
        var inn = await _context.MatchInnings
            .Include(i => i.BattingPerformances)
            .Include(i => i.BowlingPerformances)
            .FirstOrDefaultAsync(i => i.Id == inningsId);

        if (inn == null) return;

        var events = await _context.BallEvents
            .Where(b => b.InningsId == inningsId)
            .OrderBy(b => b.Id)
            .ToListAsync();

        // 1. Sync Batting Performances
        var battingPlayerIds = events.Select(e => e.StrikerPlayerId)
            .Union(events.Where(e => e.IsWicket && e.DismissedPlayerId.HasValue).Select(e => e.DismissedPlayerId!.Value))
            .Distinct()
            .ToList();

        if (inn.CurrentStrikerId.HasValue && !battingPlayerIds.Contains(inn.CurrentStrikerId.Value))
        {
            battingPlayerIds.Add(inn.CurrentStrikerId.Value);
        }
        if (inn.CurrentNonStrikerId.HasValue && !battingPlayerIds.Contains(inn.CurrentNonStrikerId.Value))
        {
            battingPlayerIds.Add(inn.CurrentNonStrikerId.Value);
        }

        foreach (var pId in battingPlayerIds)
        {
            var pEvents = events.Where(e => e.StrikerPlayerId == pId).ToList();
            int runs = pEvents.Sum(e => e.BatRuns);
            int ballsFaced = pEvents.Count(e => e.EventType != "Wide");
            int fours = pEvents.Count(e => e.BatRuns == 4);
            int sixes = pEvents.Count(e => e.BatRuns == 6);
            int dots = pEvents.Count(e => e.BatRuns == 0 && e.IsLegalBall);
            int ones = pEvents.Count(e => e.BatRuns == 1);
            int twos = pEvents.Count(e => e.BatRuns == 2);
            int threes = pEvents.Count(e => e.BatRuns == 3);
            int fives = pEvents.Count(e => e.BatRuns == 5);
            int sixRunBalls = pEvents.Count(e => e.BatRuns >= 6);

            var dismissalEvent = events.LastOrDefault(e => e.IsWicket && e.DismissedPlayerId == pId);
            bool isOut = dismissalEvent != null;
            string? dismissalType = isOut ? dismissalEvent!.WicketType : "NotOut";
            bool bowled = dismissalType == "Bowled";

            // Streaks
            int maxSixInRow = 0, currentSixStreak = 0;
            int maxFourInRow = 0, currentFourStreak = 0;
            foreach (var ev in pEvents.Where(e => e.IsLegalBall))
            {
                if (ev.BatRuns == 6)
                {
                    currentSixStreak++;
                    if (currentSixStreak > maxSixInRow) maxSixInRow = currentSixStreak;
                }
                else
                {
                    currentSixStreak = 0;
                }

                if (ev.BatRuns == 4)
                {
                    currentFourStreak++;
                    if (currentFourStreak > maxFourInRow) maxFourInRow = currentFourStreak;
                }
                else
                {
                    currentFourStreak = 0;
                }
            }

            var bp = inn.BattingPerformances.FirstOrDefault(b => b.PlayerId == pId);
            if (bp == null)
            {
                bp = new MatchBattingPerformance
                {
                    MatchInningsId = inn.Id,
                    PlayerId = pId
                };
                inn.BattingPerformances.Add(bp);
            }

            bp.Runs = runs;
            bp.BallsFaced = ballsFaced;
            bp.Fours = fours;
            bp.Sixes = sixes;
            bp.DotBalls = dots;
            bp.Ones = ones;
            bp.Twos = twos;
            bp.Threes = threes;
            bp.Fives = fives;
            bp.SixRunBalls = sixRunBalls;
            bp.IsOut = isOut;
            bp.DismissalType = dismissalType;
            bp.Bowled = bowled;
            bp.SixInRowCount = maxSixInRow;
            bp.FourInRowCount = maxFourInRow;
        }

        // 2. Sync Bowling Performances
        var bowlerIds = events.Select(e => e.BowlerPlayerId).Distinct().ToList();
        if (inn.CurrentBowlerId.HasValue && !bowlerIds.Contains(inn.CurrentBowlerId.Value))
        {
            bowlerIds.Add(inn.CurrentBowlerId.Value);
        }

        foreach (var bId in bowlerIds)
        {
            var bEvents = events.Where(e => e.BowlerPlayerId == bId).ToList();
            int ballsBowled = bEvents.Count(e => e.IsLegalBall);
            int conceded = bEvents.Sum(e => e.BatRuns + (e.ExtraType == "Wide" || e.ExtraType == "NoBall" ? e.ExtraRuns : 0));
            int wickets = bEvents.Count(e => e.IsWicket && e.BowlerCreditedWicket);
            int wides = bEvents.Count(e => e.ExtraType == "Wide");
            int noBalls = bEvents.Count(e => e.ExtraType == "NoBall");

            int maidenCount = 0;
            var bowlerOvers = bEvents.GroupBy(e => e.OverNumber);
            foreach (var ov in bowlerOvers)
            {
                if (ov.Count(e => e.IsLegalBall) == 6)
                {
                    int runsInOver = ov.Sum(e => e.BatRuns + (e.ExtraType == "Wide" || e.ExtraType == "NoBall" ? e.ExtraRuns : 0));
                    if (runsInOver == 0) maidenCount++;
                }
            }

            var bowl = inn.BowlingPerformances.FirstOrDefault(b => b.PlayerId == bId);
            if (bowl == null)
            {
                bowl = new MatchBowlingPerformance
                {
                    MatchInningsId = inn.Id,
                    PlayerId = bId
                };
                inn.BowlingPerformances.Add(bowl);
            }

            bowl.BallsBowled = ballsBowled;
            bowl.RunsConceded = conceded;
            bowl.Wickets = wickets;
            bowl.MaidenOvers = maidenCount;
            bowl.Wides = wides;
            bowl.NoBalls = noBalls;
        }

        await _context.SaveChangesAsync();
    }
}
