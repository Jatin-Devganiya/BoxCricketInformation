namespace CricketApp.Api.Models;

public class Player
{
    public int Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string PlayerCategory { get; set; } = "Batsman"; // Batsman, Bowler, AllRounder, WicketKeeper
    public string Status { get; set; } = "Active"; // Active, Inactive
    public int? UserId { get; set; }
    public User? User { get; set; }
    public int? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<TeamPlayer> TeamPlayers { get; set; } = new List<TeamPlayer>();
    public ICollection<MatchBattingPerformance> BattingPerformances { get; set; } = new List<MatchBattingPerformance>();
    public ICollection<MatchBowlingPerformance> BowlingPerformances { get; set; } = new List<MatchBowlingPerformance>();
}

public class Team
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ShortName { get; set; } = string.Empty;
    public string Status { get; set; } = "Active"; // Active, Inactive
    public int? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<TeamPlayer> TeamPlayers { get; set; } = new List<TeamPlayer>();
    public ICollection<Match> HomeMatches { get; set; } = new List<Match>();
    public ICollection<Match> AwayMatches { get; set; } = new List<Match>();
    public ICollection<MatchInnings> Innings { get; set; } = new List<MatchInnings>();
}

public class TeamPlayer
{
    public int Id { get; set; }
    public int TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public int PlayerId { get; set; }
    public Player Player { get; set; } = null!;

    public DateTime JoinedDate { get; set; } = DateTime.UtcNow;
    public DateTime? LeftDate { get; set; }
    public string Status { get; set; } = "Active"; // Active, Inactive
}
