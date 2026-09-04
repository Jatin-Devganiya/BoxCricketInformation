namespace CricketApp.Api.Models;

public class Series
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = "Scheduled"; // Scheduled, InProgress, Completed, Cancelled
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Match> Matches { get; set; } = new List<Match>();
}

public class Match
{
    public int Id { get; set; }
    public int SeriesId { get; set; }
    public Series Series { get; set; } = null!;

    public int Team1Id { get; set; }
    public Team Team1 { get; set; } = null!;

    public int Team2Id { get; set; }
    public Team Team2 { get; set; } = null!;

    public int MatchOrder { get; set; } = 1;
    public int RequiredOvers { get; set; } = 6; // Default 6 overs for box cricket
    public DateTime ScheduledDate { get; set; }
    public string ScheduledTime { get; set; } = "18:00";
    public string Address { get; set; } = string.Empty;
    public string Status { get; set; } = "Scheduled"; // Scheduled, InProgress, Completed, Abandoned, Cancelled

    public int? WinningTeamId { get; set; }
    public Team? WinningTeam { get; set; }

    public string? Result { get; set; }
    public int? MOMPlayerId { get; set; }
    public Player? MOMPlayer { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<MatchInnings> Innings { get; set; } = new List<MatchInnings>();
}

public class MatchInnings
{
    public int Id { get; set; }
    public int MatchId { get; set; }
    public Match Match { get; set; } = null!;

    public int TeamId { get; set; } // Batting Team
    public Team Team { get; set; } = null!;

    public int InningsNumber { get; set; } // 1 or 2
    public int Runs { get; set; } = 0;
    public int Wickets { get; set; } = 0;
    public int Balls { get; set; } = 0; // Legal balls bowled
    public int Extras { get; set; } = 0; // Total extras (Wides, No Balls, Leg Byes)
    public string Status { get; set; } = "Scheduled"; // Scheduled, InProgress, Completed

    public int? CurrentStrikerId { get; set; }
    public Player? CurrentStriker { get; set; }

    public int? CurrentNonStrikerId { get; set; }
    public Player? CurrentNonStriker { get; set; }

    public int? CurrentBowlerId { get; set; }
    public Player? CurrentBowler { get; set; }

    public ICollection<MatchBattingPerformance> BattingPerformances { get; set; } = new List<MatchBattingPerformance>();
    public ICollection<MatchBowlingPerformance> BowlingPerformances { get; set; } = new List<MatchBowlingPerformance>();
    public ICollection<BallEvent> BallEvents { get; set; } = new List<BallEvent>();
}

public class MatchBattingPerformance
{
    public int Id { get; set; }
    public int MatchInningsId { get; set; }
    public MatchInnings MatchInnings { get; set; } = null!;

    public int PlayerId { get; set; }
    public Player Player { get; set; } = null!;

    public int Runs { get; set; } = 0;
    public int BallsFaced { get; set; } = 0;
    public int Fours { get; set; } = 0;
    public int Sixes { get; set; } = 0;
    public int DotBalls { get; set; } = 0;
    public int Ones { get; set; } = 0;
    public int Twos { get; set; } = 0;
    public int Threes { get; set; } = 0;
    public int Fives { get; set; } = 0;
    public int SixRunBalls { get; set; } = 0;
    public bool IsOut { get; set; } = false;
    public string? DismissalType { get; set; } = "NotOut"; // NotOut, Bowled, Caught, RunOut, LBW, Stumped, HitWicket
    public bool Bowled { get; set; } = false;
    public int SixInRowCount { get; set; } = 0;
    public int FourInRowCount { get; set; } = 0;
}

public class MatchBowlingPerformance
{
    public int Id { get; set; }
    public int MatchInningsId { get; set; }
    public MatchInnings MatchInnings { get; set; } = null!;

    public int PlayerId { get; set; }
    public Player Player { get; set; } = null!;

    public int BallsBowled { get; set; } = 0; // Legal balls bowled
    public int RunsConceded { get; set; } = 0;
    public int Wickets { get; set; } = 0;
    public int MaidenOvers { get; set; } = 0;
    public int HatTricks { get; set; } = 0;
    public int Wides { get; set; } = 0;
    public int NoBalls { get; set; } = 0;
}

public class BallEvent
{
    public int Id { get; set; }
    public int MatchId { get; set; }
    public Match Match { get; set; } = null!;

    public int InningsId { get; set; }
    public MatchInnings MatchInnings { get; set; } = null!;

    public int OverNumber { get; set; } // 1-indexed (e.g. 1 for Over 1)
    public int BallNumber { get; set; } // Legal ball in over (1 to 6)
    public int DeliveryNumber { get; set; } // Delivery order in over (1, 2, 3...)

    public int StrikerPlayerId { get; set; }
    public Player StrikerPlayer { get; set; } = null!;

    public int NonStrikerPlayerId { get; set; }
    public Player NonStrikerPlayer { get; set; } = null!;

    public int BowlerPlayerId { get; set; }
    public Player BowlerPlayer { get; set; } = null!;

    public string EventType { get; set; } = "Normal"; // Normal, Wicket, NoBall, Wide, LegBye, DeadBall
    public int Runs { get; set; } = 0; // Total team runs
    public int BatRuns { get; set; } = 0; // Striker runs
    public int ExtraRuns { get; set; } = 0; // Extras
    public string ExtraType { get; set; } = "None"; // None, Wide, NoBall, LegBye

    public bool IsLegalBall { get; set; } = true;
    public bool IsWicket { get; set; } = false;
    public string? WicketType { get; set; } // Bowled, Caught, RunOut, Stumped, HitWicket
    public int? DismissedPlayerId { get; set; }
    public Player? DismissedPlayer { get; set; }
    public int? FielderPlayerId { get; set; }
    public Player? FielderPlayer { get; set; }
    public bool BowlerCreditedWicket { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
