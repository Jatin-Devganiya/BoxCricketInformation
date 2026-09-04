using CricketApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Data;

public class CricketDbContext : DbContext
{
    public CricketDbContext(DbContextOptions<CricketDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Player> Players => Set<Player>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<TeamPlayer> TeamPlayers => Set<TeamPlayer>();
    public DbSet<Series> Series => Set<Series>();
    public DbSet<Match> Matches => Set<Match>();
    public DbSet<MatchInnings> MatchInnings => Set<MatchInnings>();
    public DbSet<MatchBattingPerformance> MatchBattingPerformances => Set<MatchBattingPerformance>();
    public DbSet<MatchBowlingPerformance> MatchBowlingPerformances => Set<MatchBowlingPerformance>();
    public DbSet<BallEvent> BallEvents => Set<BallEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Username).IsUnique();
            entity.Property(u => u.Username).HasMaxLength(50).IsRequired();
            entity.Property(u => u.FirstName).HasMaxLength(50).IsRequired();
            entity.Property(u => u.LastName).HasMaxLength(50).IsRequired();
            entity.Property(u => u.PasswordHash).IsRequired();
            entity.Property(u => u.Status).HasMaxLength(20).HasDefaultValue("Active");
        });

        // Role
        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.Name).HasMaxLength(20).IsRequired();
        });

        // UserRole (Composite Key)
        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.HasKey(ur => new { ur.UserId, ur.RoleId });

            entity.HasOne(ur => ur.User)
                  .WithMany(u => u.UserRoles)
                  .HasForeignKey(ur => ur.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ur => ur.Role)
                  .WithMany(r => r.UserRoles)
                  .HasForeignKey(ur => ur.RoleId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Player
        modelBuilder.Entity<Player>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.FirstName).HasMaxLength(50).IsRequired();
            entity.Property(p => p.LastName).HasMaxLength(50).IsRequired();
            entity.Property(p => p.PlayerCategory).HasMaxLength(30).HasDefaultValue("Batsman");
            entity.Property(p => p.Status).HasMaxLength(20).HasDefaultValue("Active");

            entity.HasOne(p => p.User)
                  .WithOne(u => u.Player)
                  .HasForeignKey<Player>(p => p.UserId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(p => p.LastName);
        });

        // Team
        modelBuilder.Entity<Team>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Name).HasMaxLength(100).IsRequired();
            entity.Property(t => t.ShortName).HasMaxLength(10).IsRequired();
            entity.Property(t => t.Status).HasMaxLength(20).HasDefaultValue("Active");
            entity.HasIndex(t => t.Name);
        });

        // TeamPlayer
        modelBuilder.Entity<TeamPlayer>(entity =>
        {
            entity.HasKey(tp => tp.Id);

            entity.HasOne(tp => tp.Team)
                  .WithMany(t => t.TeamPlayers)
                  .HasForeignKey(tp => tp.TeamId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(tp => tp.Player)
                  .WithMany(p => p.TeamPlayers)
                  .HasForeignKey(tp => tp.PlayerId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(tp => new { tp.TeamId, tp.PlayerId });
        });

        // Series
        modelBuilder.Entity<Series>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Name).HasMaxLength(150).IsRequired();
            entity.Property(s => s.Status).HasMaxLength(20).HasDefaultValue("Scheduled");
            entity.HasIndex(s => s.StartDate);
        });

        // Match
        modelBuilder.Entity<Match>(entity =>
        {
            entity.HasKey(m => m.Id);

            entity.HasOne(m => m.Series)
                  .WithMany(s => s.Matches)
                  .HasForeignKey(m => m.SeriesId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(m => m.Team1)
                  .WithMany(t => t.HomeMatches)
                  .HasForeignKey(m => m.Team1Id)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(m => m.Team2)
                  .WithMany(t => t.AwayMatches)
                  .HasForeignKey(m => m.Team2Id)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(m => m.WinningTeam)
                  .WithMany()
                  .HasForeignKey(m => m.WinningTeamId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(m => m.MOMPlayer)
                  .WithMany()
                  .HasForeignKey(m => m.MOMPlayerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.Property(m => m.Status).HasMaxLength(20).HasDefaultValue("Scheduled");
            entity.Property(m => m.Address).HasMaxLength(250);
            entity.Property(m => m.ScheduledTime).HasMaxLength(20);

            entity.HasIndex(m => m.SeriesId);
            entity.HasIndex(m => m.ScheduledDate);
        });

        // MatchInnings
        modelBuilder.Entity<MatchInnings>(entity =>
        {
            entity.HasKey(mi => mi.Id);

            entity.HasOne(mi => mi.Match)
                  .WithMany(m => m.Innings)
                  .HasForeignKey(mi => mi.MatchId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(mi => mi.Team)
                  .WithMany(t => t.Innings)
                  .HasForeignKey(mi => mi.TeamId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(mi => mi.CurrentStriker)
                  .WithMany()
                  .HasForeignKey(mi => mi.CurrentStrikerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(mi => mi.CurrentNonStriker)
                  .WithMany()
                  .HasForeignKey(mi => mi.CurrentNonStrikerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(mi => mi.CurrentBowler)
                  .WithMany()
                  .HasForeignKey(mi => mi.CurrentBowlerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(mi => new { mi.MatchId, mi.InningsNumber }).IsUnique();
        });

        // MatchBattingPerformance
        modelBuilder.Entity<MatchBattingPerformance>(entity =>
        {
            entity.HasKey(mbp => mbp.Id);

            entity.HasOne(mbp => mbp.MatchInnings)
                  .WithMany(mi => mi.BattingPerformances)
                  .HasForeignKey(mbp => mbp.MatchInningsId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(mbp => mbp.Player)
                  .WithMany(p => p.BattingPerformances)
                  .HasForeignKey(mbp => mbp.PlayerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(mbp => mbp.PlayerId);
        });

        // MatchBowlingPerformance
        modelBuilder.Entity<MatchBowlingPerformance>(entity =>
        {
            entity.HasKey(mbp => mbp.Id);

            entity.HasOne(mbp => mbp.MatchInnings)
                  .WithMany(mi => mi.BowlingPerformances)
                  .HasForeignKey(mbp => mbp.MatchInningsId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(mbp => mbp.Player)
                  .WithMany(p => p.BowlingPerformances)
                  .HasForeignKey(mbp => mbp.PlayerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(mbp => mbp.PlayerId);
        });

        // BallEvent
        modelBuilder.Entity<BallEvent>(entity =>
        {
            entity.HasKey(b => b.Id);

            entity.HasOne(b => b.Match)
                  .WithMany()
                  .HasForeignKey(b => b.MatchId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(b => b.MatchInnings)
                  .WithMany(mi => mi.BallEvents)
                  .HasForeignKey(b => b.InningsId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(b => b.StrikerPlayer)
                  .WithMany()
                  .HasForeignKey(b => b.StrikerPlayerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(b => b.NonStrikerPlayer)
                  .WithMany()
                  .HasForeignKey(b => b.NonStrikerPlayerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(b => b.BowlerPlayer)
                  .WithMany()
                  .HasForeignKey(b => b.BowlerPlayerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(b => b.DismissedPlayer)
                  .WithMany()
                  .HasForeignKey(b => b.DismissedPlayerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(b => b.FielderPlayer)
                  .WithMany()
                  .HasForeignKey(b => b.FielderPlayerId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(b => new { b.MatchId, b.InningsId });
            entity.HasIndex(b => b.FielderPlayerId);
            entity.HasIndex(b => b.CreatedAt);
        });
    }
}
