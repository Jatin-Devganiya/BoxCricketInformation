namespace CricketApp.Api.DTOs;

public class PlayerDto
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}";
    public string PlayerCategory { get; set; } = string.Empty; // Batsman, Bowler, etc.
    public string Status { get; set; } = string.Empty;
    public int? UserId { get; set; }
    public string? CurrentTeamName { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreatePlayerRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PlayerCategory { get; set; } = "Batsman";
    public string Status { get; set; } = "Active";
    public int? UserId { get; set; }
    public int? TeamId { get; set; }
}

public class UpdatePlayerRequest
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PlayerCategory { get; set; } = "Batsman";
    public string Status { get; set; } = "Active";
    public int? UserId { get; set; }
    public int? TeamId { get; set; }
}

public class PlayerStatisticsDto
{
    public int PlayerId { get; set; }
    public string PlayerName { get; set; } = string.Empty;
    public string PlayerCategory { get; set; } = string.Empty;
    public BattingStatsDto Batting { get; set; } = new();
    public BowlingStatsDto Bowling { get; set; } = new();
    public FieldingStatsDto Fielding { get; set; } = new();
}

public class FieldingStatsDto
{
    public int Catches { get; set; }
    public int Stumpings { get; set; }
    public int RunOuts { get; set; }
}

public class BattingStatsDto
{
    public int Matches { get; set; }
    public int Innings { get; set; }
    public int TotalRuns { get; set; }
    public int BallsFaced { get; set; }
    public int TotalBallsPlayed { get; set; }
    public int HighestScore { get; set; }
    public double RunRate { get; set; } // Strike Rate
    public int Fours { get; set; }
    public int Sixes { get; set; }
    public int DotBalls { get; set; }
    public int ZeroOutCount { get; set; }
    public int Ones { get; set; }
    public int Twos { get; set; }
    public int Threes { get; set; }
    public int Fives { get; set; }
    public int SixRunBalls { get; set; }
    public int SixInRowCount { get; set; }
    public int FourInRowCount { get; set; }
    public int Dismissals { get; set; }
}

public class BowlingStatsDto
{
    public int Matches { get; set; }
    public int Innings { get; set; }
    public int BallsBowled { get; set; }
    public string OversFormatted { get; set; } = "0.0"; // e.g. 1.5
    public int RunsConceded { get; set; }
    public int Wickets { get; set; }
    public double EconomyRate { get; set; }
    public string HighestWickets { get; set; } = "0/0"; // e.g. 3/26
    public int MaidenOvers { get; set; }
    public int HatTricks { get; set; }
    public int Wides { get; set; }
    public int NoBalls { get; set; }
}

public class TeamDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ShortName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int PlayerCount { get; set; }
}

public class TeamDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ShortName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public List<PlayerDto> Players { get; set; } = new();
}

public class CreateTeamRequest
{
    public string Name { get; set; } = string.Empty;
    public string ShortName { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
}

public class UpdateTeamRequest
{
    public string Name { get; set; } = string.Empty;
    public string ShortName { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
}

public class AssignPlayerToTeamRequest
{
    public int PlayerId { get; set; }
}
