namespace CricketApp.Api.DTOs;

public class SeriesDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int TotalMatches { get; set; }
    public int CompletedMatches { get; set; }
}

public class SeriesDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<MatchDto> Matches { get; set; } = new();
}

public class CreateSeriesRequest
{
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = "Scheduled";
    public string? Description { get; set; }
}

public class UpdateSeriesRequest
{
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = "Scheduled";
    public string? Description { get; set; }
}

public class MatchDto
{
    public int Id { get; set; }
    public int SeriesId { get; set; }
    public string SeriesName { get; set; } = string.Empty;
    public int Team1Id { get; set; }
    public string Team1Name { get; set; } = string.Empty;
    public string Team1ShortName { get; set; } = string.Empty;
    public int Team2Id { get; set; }
    public string Team2Name { get; set; } = string.Empty;
    public string Team2ShortName { get; set; } = string.Empty;
    public int MatchOrder { get; set; }
    public int RequiredOvers { get; set; }
    public DateTime ScheduledDate { get; set; }
    public string ScheduledTime { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int? WinningTeamId { get; set; }
    public string? WinningTeamName { get; set; }
    public string? Result { get; set; }
    public string? ResultType { get; set; }
    public int? WinningMargin { get; set; }
    public int? MOMPlayerId { get; set; }
    public string? MOMPlayerName { get; set; }
    public double? MOMScore { get; set; }
}

public class CreateMatchRequest
{
    public int SeriesId { get; set; }
    public int Team1Id { get; set; }
    public int Team2Id { get; set; }
    public int MatchOrder { get; set; } = 1;
    public int RequiredOvers { get; set; } = 6;
    public DateTime ScheduledDate { get; set; }
    public string ScheduledTime { get; set; } = "18:00";
    public string Address { get; set; } = string.Empty;
    public string Status { get; set; } = "Scheduled";
}

public class UpdateMatchRequest
{
    public int SeriesId { get; set; }
    public int Team1Id { get; set; }
    public int Team2Id { get; set; }
    public int MatchOrder { get; set; }
    public int RequiredOvers { get; set; }
    public DateTime ScheduledDate { get; set; }
    public string ScheduledTime { get; set; } = "18:00";
    public string Address { get; set; } = string.Empty;
    public string Status { get; set; } = "Scheduled";
    public int? WinningTeamId { get; set; }
    public string? Result { get; set; }
    public int? MOMPlayerId { get; set; }
}

public class ScorecardDto
{
    public MatchDto Match { get; set; } = null!;
    public InningsScorecardDto? Innings1 { get; set; }
    public InningsScorecardDto? Innings2 { get; set; }
}

public class InningsScorecardDto
{
    public int Id { get; set; }
    public int MatchId { get; set; }
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public int InningsNumber { get; set; }
    public int Runs { get; set; }
    public int Wickets { get; set; }
    public int Balls { get; set; }
    public string OversDisplay { get; set; } = "0.0";
    public string Status { get; set; } = string.Empty;
    public int Extras { get; set; } = 0;
    public List<BattingRecordDto> BattingPerformances { get; set; } = new();
    public List<BowlingRecordDto> BowlingPerformances { get; set; } = new();
}

public class BattingRecordDto
{
    public int Id { get; set; }
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public int Runs { get; set; }
    public int BallsFaced { get; set; }
    public int Fours { get; set; }
    public int Sixes { get; set; }
    public int DotBalls { get; set; }
    public int Ones { get; set; }
    public int Twos { get; set; }
    public int Threes { get; set; }
    public int Fives { get; set; }
    public int SixRunBalls { get; set; }
    public bool IsOut { get; set; }
    public string? DismissalType { get; set; }
    public bool Bowled { get; set; }
    public int SixInRowCount { get; set; }
    public int FourInRowCount { get; set; }
    public double StrikeRate { get; set; }
}

public class BowlingRecordDto
{
    public int Id { get; set; }
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public int BallsBowled { get; set; }
    public string OversDisplay { get; set; } = "0.0";
    public int RunsConceded { get; set; }
    public int Wickets { get; set; }
    public int MaidenOvers { get; set; }
    public int HatTricks { get; set; }
    public int Wides { get; set; }
    public int NoBalls { get; set; }
    public double EconomyRate { get; set; }
}

public class SaveScorecardRequest
{
    public SaveInningsRequest? Innings1 { get; set; }
    public SaveInningsRequest? Innings2 { get; set; }
    public int? WinningTeamId { get; set; }
    public string? Result { get; set; }
    public int? MOMPlayerId { get; set; }
    public string Status { get; set; } = "Completed"; // InProgress, Completed
}

public class SaveInningsRequest
{
    public int TeamId { get; set; }
    public int Runs { get; set; }
    public int Wickets { get; set; }
    public int Balls { get; set; }
    public string Status { get; set; } = "Completed";
    public List<SaveBattingPerformanceRequest> BattingPerformances { get; set; } = new();
    public List<SaveBowlingPerformanceRequest> BowlingPerformances { get; set; } = new();
}

public class SaveBattingPerformanceRequest
{
    public int? Id { get; set; }
    public int PlayerId { get; set; }
    public int Runs { get; set; }
    public int BallsFaced { get; set; }
    public int Fours { get; set; }
    public int Sixes { get; set; }
    public int DotBalls { get; set; }
    public int Ones { get; set; }
    public int Twos { get; set; }
    public int Threes { get; set; }
    public int Fives { get; set; }
    public int SixRunBalls { get; set; }
    public bool IsOut { get; set; }
    public string? DismissalType { get; set; }
    public bool Bowled { get; set; }
    public int SixInRowCount { get; set; }
    public int FourInRowCount { get; set; }
}

public class SaveBowlingPerformanceRequest
{
    public int? Id { get; set; }
    public int PlayerId { get; set; }
    public int BallsBowled { get; set; }
    public int RunsConceded { get; set; }
    public int Wickets { get; set; }
    public int MaidenOvers { get; set; }
    public int HatTricks { get; set; }
    public int Wides { get; set; }
    public int NoBalls { get; set; }
}

public class DashboardStatsDto
{
    public int TotalPlayers { get; set; }
    public int TotalTeams { get; set; }
    public int TotalSeries { get; set; }
    public int TotalMatches { get; set; }
    public int CompletedMatches { get; set; }
    public int ScheduledMatches { get; set; }
    public int TodayMatches { get; set; }
    public List<MatchDto> RecentMatches { get; set; } = new();
    public List<TopPerformerDto> TopRunScorers { get; set; } = new();
    public List<TopBowlerDto> TopWicketTakers { get; set; } = new();
}

public class TopPerformerDto
{
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public string TeamName { get; set; } = string.Empty;
    public int TotalRuns { get; set; }
    public int Innings { get; set; }
    public double StrikeRate { get; set; }
}

public class TopBowlerDto
{
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public string TeamName { get; set; } = string.Empty;
    public int TotalWickets { get; set; }
    public int Innings { get; set; }
    public double EconomyRate { get; set; }
}

public class LiveScoreDto
{
    public MatchDto Match { get; set; } = null!;
    public int ActiveInningsNumber { get; set; } = 1;
    public LiveInningsDto? Innings1 { get; set; }
    public LiveInningsDto? Innings2 { get; set; }
    public LiveInningsDto? CurrentInnings => ActiveInningsNumber == 1 ? Innings1 : Innings2;
    public bool IsInningsComplete { get; set; }
    public bool IsMatchComplete { get; set; }
    public string? MatchSummary { get; set; }
    public MomCalculationResultDto? MomDetails { get; set; }
    public MatchResultCalculationResultDto? CalculatedResult { get; set; }
}

public class LiveInningsDto
{
    public int Id { get; set; }
    public int MatchId { get; set; }
    public int InningsNumber { get; set; }
    public int CurrentOverNumber { get; set; } = 1;
    public int BattingTeamId { get; set; }
    public string BattingTeamName { get; set; } = string.Empty;
    public string BattingTeamShortName { get; set; } = string.Empty;
    public int BowlingTeamId { get; set; }
    public string BowlingTeamName { get; set; } = string.Empty;
    public string BowlingTeamShortName { get; set; } = string.Empty;
    public int Runs { get; set; }
    public int Wickets { get; set; }
    public int LegalBalls { get; set; }
    public string OversDisplay { get; set; } = "0.0";
    public int Extras { get; set; }
    public string Status { get; set; } = "Scheduled"; // Scheduled, InProgress, Completed
    public double CurrentRunRate { get; set; }
    public int? TargetRuns { get; set; }
    public double? RequiredRunRate { get; set; }

    public LiveBatsmanDto? Striker { get; set; }
    public LiveBatsmanDto? NonStriker { get; set; }
    public LiveBowlerDto? CurrentBowler { get; set; }

    public int? PreviousBowlerId { get; set; }
    public string? PreviousBowlerName { get; set; }

    public bool IsOverComplete { get; set; }
    public bool RequiresNewBatsman { get; set; }
    public int? LastDismissedPlayerId { get; set; }

    public List<BallEventDto> CurrentOverDeliveries { get; set; } = new();
    public List<BallEventDto> AllDeliveries { get; set; } = new();
    public List<BattingRecordDto> BattingPerformances { get; set; } = new();
    public List<BowlingRecordDto> BowlingPerformances { get; set; } = new();
}

public class LiveBatsmanDto
{
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public int Runs { get; set; }
    public int BallsFaced { get; set; }
    public int Fours { get; set; }
    public int Sixes { get; set; }
    public int DotBalls { get; set; }
    public int Ones { get; set; }
    public int Twos { get; set; }
    public int Threes { get; set; }
    public double StrikeRate { get; set; }
    public bool IsStriker { get; set; }
}

public class LiveBowlerDto
{
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public int BallsBowled { get; set; }
    public string OversDisplay { get; set; } = "0.0";
    public int RunsConceded { get; set; }
    public int Wickets { get; set; }
    public int MaidenOvers { get; set; }
    public int Wides { get; set; }
    public int NoBalls { get; set; }
    public double EconomyRate { get; set; }
}

public class BallEventDto
{
    public int Id { get; set; }
    public int OverNumber { get; set; }
    public int BallNumber { get; set; }
    public int DeliveryNumber { get; set; }
    public int StrikerPlayerId { get; set; }
    public string StrikerName { get; set; } = string.Empty;
    public int NonStrikerPlayerId { get; set; }
    public string NonStrikerName { get; set; } = string.Empty;
    public int BowlerPlayerId { get; set; }
    public string BowlerName { get; set; } = string.Empty;
    public string EventType { get; set; } = "Normal";
    public int Runs { get; set; }
    public int BatRuns { get; set; }
    public int ExtraRuns { get; set; }
    public string ExtraType { get; set; } = "None";
    public bool IsLegalBall { get; set; }
    public bool IsWicket { get; set; }
    public string? WicketType { get; set; }
    public int? DismissedPlayerId { get; set; }
    public string? DismissedPlayerName { get; set; }
    public int? FielderPlayerId { get; set; }
    public string? FielderPlayerName { get; set; }
    public bool BowlerCreditedWicket { get; set; }
    public string DisplayText { get; set; } = string.Empty; // e.g. "0", "1", "4", "6", "W", "Wd", "Nb", "Lb", "•"
    public DateTime CreatedAt { get; set; }
}

public class StartInningsRequest
{
    public int InningsNumber { get; set; } = 1; // 1 or 2
    public int BattingTeamId { get; set; }
    public int StrikerPlayerId { get; set; }
    public int NonStrikerPlayerId { get; set; }
    public int BowlerPlayerId { get; set; }
}

public class RecordBallRequest
{
    public string EventType { get; set; } = "Normal"; // Normal, NoBall, Wide, LegBye, DeadBall
    public int Runs { get; set; } = 0; // Total team runs
    public int BatRuns { get; set; } = 0; // Runs from bat (striker)
    public int ExtraRuns { get; set; } = 0; // Runs from extras
    public string ExtraType { get; set; } = "None"; // None, Wide, NoBall, LegBye
    public int? BowlerPlayerId { get; set; }
    public int? StrikerPlayerId { get; set; }
    public int? NonStrikerPlayerId { get; set; }
    public int? OverNumber { get; set; }
    public int? BallNumber { get; set; }
}

public class RecordWicketRequest
{
    public int DismissedPlayerId { get; set; }
    public string WicketType { get; set; } = "Bowled"; // Bowled, Caught, RunOut, Stumped, HitWicket
    public int? FielderPlayerId { get; set; }
    public int RunsScored { get; set; } = 0; // Runs completed before dismissal if any
}

public class SelectNewBatsmanRequest
{
    public int NewBatsmanPlayerId { get; set; }
}

public class NextOverRequest
{
    public int NextBowlerPlayerId { get; set; }
}

public class CompleteMatchRequest
{
    public int? WinningTeamId { get; set; }
    public string? Result { get; set; }
    public int? MOMPlayerId { get; set; }
}

public class MomCalculationResultDto
{
    public int? SelectedPlayerId { get; set; }
    public string? SelectedPlayerName { get; set; }
    public string? SelectedPlayerTeamName { get; set; }
    public double TotalScore { get; set; }
    public double BattingPoints { get; set; }
    public double BowlingPoints { get; set; }
    public double AllRounderBonus { get; set; }
    public double WinningTeamBonus { get; set; }
    public string BattingSummary { get; set; } = "Did not bat";
    public string BowlingSummary { get; set; } = "Did not bowl";
    public List<PlayerMomScoreDto> Leaderboard { get; set; } = new();
}

public class PlayerMomScoreDto
{
    public int Rank { get; set; }
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public double TotalScore { get; set; }
    public double BattingPoints { get; set; }
    public double BowlingPoints { get; set; }
    public double AllRounderBonus { get; set; }
    public double WinningTeamBonus { get; set; }
    public int Runs { get; set; }
    public int BallsFaced { get; set; }
    public int Fours { get; set; }
    public int Sixes { get; set; }
    public bool IsOut { get; set; }
    public double StrikeRate { get; set; }
    public int Wickets { get; set; }
    public int BallsBowled { get; set; }
    public string OversDisplay { get; set; } = "0.0";
    public int RunsConceded { get; set; }
    public double EconomyRate { get; set; }
    public int Maidens { get; set; }
    public string BattingSummary { get; set; } = string.Empty;
    public string BowlingSummary { get; set; } = string.Empty;
    public bool HasContribution { get; set; }
}

public class MatchResultCalculationResultDto
{
    public string ResultDescription { get; set; } = "Result pending";
    public string ResultType { get; set; } = "pending";
    public int? WinningTeamId { get; set; }
    public string? WinningTeamName { get; set; }
    public int? WinningMargin { get; set; }
    public bool IsComplete { get; set; }
    public string? Summary { get; set; }
}
