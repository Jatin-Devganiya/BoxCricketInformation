using CricketApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(CricketDbContext context)
    {
        await context.Database.EnsureCreatedAsync();

        // Ensure BallEvents table and MatchInnings columns exist for existing databases
        var ensureSchemaSql = @"
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MatchInnings') AND name = 'CurrentStrikerId')
BEGIN
    ALTER TABLE MatchInnings ADD CurrentStrikerId INT NULL;
    ALTER TABLE MatchInnings ADD CONSTRAINT FK_MatchInnings_Players_CurrentStrikerId FOREIGN KEY (CurrentStrikerId) REFERENCES Players(Id);
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MatchInnings') AND name = 'CurrentNonStrikerId')
BEGIN
    ALTER TABLE MatchInnings ADD CurrentNonStrikerId INT NULL;
    ALTER TABLE MatchInnings ADD CONSTRAINT FK_MatchInnings_Players_CurrentNonStrikerId FOREIGN KEY (CurrentNonStrikerId) REFERENCES Players(Id);
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MatchInnings') AND name = 'CurrentBowlerId')
BEGIN
    ALTER TABLE MatchInnings ADD CurrentBowlerId INT NULL;
    ALTER TABLE MatchInnings ADD CONSTRAINT FK_MatchInnings_Players_CurrentBowlerId FOREIGN KEY (CurrentBowlerId) REFERENCES Players(Id);
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MatchInnings') AND name = 'Extras')
BEGIN
    ALTER TABLE MatchInnings ADD Extras INT NOT NULL CONSTRAINT DF_MatchInnings_Extras DEFAULT 0;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Matches') AND name = 'MOMScore')
BEGIN
    ALTER TABLE Matches ADD MOMScore FLOAT NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Matches') AND name = 'ResultType')
BEGIN
    ALTER TABLE Matches ADD ResultType NVARCHAR(50) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Matches') AND name = 'WinningMargin')
BEGIN
    ALTER TABLE Matches ADD WinningMargin INT NULL;
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'BallEvents')
BEGIN
    CREATE TABLE BallEvents (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        MatchId INT NOT NULL,
        InningsId INT NOT NULL,
        OverNumber INT NOT NULL,
        BallNumber INT NOT NULL,
        DeliveryNumber INT NOT NULL,
        StrikerPlayerId INT NOT NULL,
        NonStrikerPlayerId INT NOT NULL,
        BowlerPlayerId INT NOT NULL,
        EventType NVARCHAR(50) NOT NULL DEFAULT 'Normal',
        Runs INT NOT NULL DEFAULT 0,
        BatRuns INT NOT NULL DEFAULT 0,
        ExtraRuns INT NOT NULL DEFAULT 0,
        ExtraType NVARCHAR(50) NOT NULL DEFAULT 'None',
        IsLegalBall BIT NOT NULL DEFAULT 1,
        IsWicket BIT NOT NULL DEFAULT 0,
        WicketType NVARCHAR(50) NULL,
        DismissedPlayerId INT NULL,
        FielderPlayerId INT NULL,
        BowlerCreditedWicket BIT NOT NULL DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_BallEvents_Matches_MatchId FOREIGN KEY (MatchId) REFERENCES Matches(Id),
        CONSTRAINT FK_BallEvents_MatchInnings_InningsId FOREIGN KEY (InningsId) REFERENCES MatchInnings(Id) ON DELETE CASCADE,
        CONSTRAINT FK_BallEvents_Players_StrikerPlayerId FOREIGN KEY (StrikerPlayerId) REFERENCES Players(Id),
        CONSTRAINT FK_BallEvents_Players_NonStrikerPlayerId FOREIGN KEY (NonStrikerPlayerId) REFERENCES Players(Id),
        CONSTRAINT FK_BallEvents_Players_BowlerPlayerId FOREIGN KEY (BowlerPlayerId) REFERENCES Players(Id),
        CONSTRAINT FK_BallEvents_Players_DismissedPlayerId FOREIGN KEY (DismissedPlayerId) REFERENCES Players(Id),
        CONSTRAINT FK_BallEvents_Players_FielderPlayerId FOREIGN KEY (FielderPlayerId) REFERENCES Players(Id)
    );

    CREATE INDEX IX_BallEvents_FielderPlayerId ON BallEvents(FielderPlayerId);
    CREATE INDEX IX_BallEvents_CreatedAt ON BallEvents(CreatedAt);
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserPermissionOverrides')
BEGIN
    CREATE TABLE UserPermissionOverrides (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UserId INT NOT NULL,
        Permission NVARCHAR(50) NOT NULL,
        IsAllowed BIT NOT NULL,
        CONSTRAINT FK_UserPermissionOverrides_Users_UserId FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IX_UserPermissionOverrides_UserId_Permission ON UserPermissionOverrides(UserId, Permission);
END
";
        try
        {
            await context.Database.ExecuteSqlRawAsync(ensureSchemaSql);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Schema update check note: {ex.Message}");
        }

        // 1. Seed Roles
        if (!await context.Roles.AnyAsync())
        {
            var adminRole = new Role { Name = "Admin" };
            var umpireRole = new Role { Name = "Umpire" };
            var userRole = new Role { Name = "User" };
            await context.Roles.AddRangeAsync(adminRole, umpireRole, userRole);
            await context.SaveChangesAsync();
        }
        else if (!await context.Roles.AnyAsync(r => r.Name == "Umpire"))
        {
            await context.Roles.AddAsync(new Role { Name = "Umpire" });
            await context.SaveChangesAsync();
        }

        var adminRoleObj = await context.Roles.FirstAsync(r => r.Name == "Admin");
        var umpireRoleObj = await context.Roles.FirstAsync(r => r.Name == "Umpire");
        var userRoleObj = await context.Roles.FirstAsync(r => r.Name == "User");

        // 2. Seed Users
        if (!await context.Users.AnyAsync())
        {
            var adminUser = new User
            {
                Username = "admin",
                FirstName = "System",
                LastName = "Administrator",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var umpireUser = new User
            {
                Username = "umpire",
                FirstName = "Official",
                LastName = "Umpire",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Umpire@123"),
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var scorerUser = new User
            {
                Username = "user",
                FirstName = "Match",
                LastName = "Scorer",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("User@123"),
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await context.Users.AddRangeAsync(adminUser, umpireUser, scorerUser);
            await context.SaveChangesAsync();

            await context.UserRoles.AddRangeAsync(
                new UserRole { UserId = adminUser.Id, RoleId = adminRoleObj.Id },
                new UserRole { UserId = umpireUser.Id, RoleId = umpireRoleObj.Id },
                new UserRole { UserId = scorerUser.Id, RoleId = userRoleObj.Id }
            );
            await context.SaveChangesAsync();
        }
        else if (!await context.Users.AnyAsync(u => u.Username.ToLower() == "umpire"))
        {
            var umpireUser = new User
            {
                Username = "umpire",
                FirstName = "Official",
                LastName = "Umpire",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Umpire@123"),
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await context.Users.AddAsync(umpireUser);
            await context.SaveChangesAsync();

            await context.UserRoles.AddAsync(new UserRole { UserId = umpireUser.Id, RoleId = umpireRoleObj.Id });
            await context.SaveChangesAsync();
        }

        if (!await context.Users.AnyAsync(u => u.Username.ToLower() == "john"))
        {
            var johnUser = new User
            {
                Username = "john",
                FirstName = "John",
                LastName = "Official",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("John@123"),
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await context.Users.AddAsync(johnUser);
            await context.SaveChangesAsync();

            await context.UserRoles.AddAsync(new UserRole { UserId = johnUser.Id, RoleId = umpireRoleObj.Id });
            await context.UserPermissionOverrides.AddAsync(new UserPermissionOverride
            {
                UserId = johnUser.Id,
                Permission = "LiveScoring",
                IsAllowed = false
            });
            await context.SaveChangesAsync();
        }

        // 3. Seed Teams
        if (!await context.Teams.AnyAsync())
        {
            var team1 = new Team { Name = "Royal Strikers", ShortName = "RS", Status = "Active" };
            var team2 = new Team { Name = "Thunder Kings", ShortName = "TK", Status = "Active" };
            var team3 = new Team { Name = "Super Blasters", ShortName = "SB", Status = "Active" };
            var team4 = new Team { Name = "Phoenix Warriors", ShortName = "PW", Status = "Active" };

            await context.Teams.AddRangeAsync(team1, team2, team3, team4);
            await context.SaveChangesAsync();

            // 4. Seed Players
            var players = new List<Player>
            {
                new() { FirstName = "Rohit", LastName = "Sharma", PlayerCategory = "Batsman", Status = "Active" },
                new() { FirstName = "Virat", LastName = "Kohli", PlayerCategory = "Batsman", Status = "Active" },
                new() { FirstName = "Jasprit", LastName = "Bumrah", PlayerCategory = "Bowler", Status = "Active" },
                new() { FirstName = "Hardik", LastName = "Pandya", PlayerCategory = "Batsman", Status = "Active" },
                new() { FirstName = "Ravindra", LastName = "Jadeja", PlayerCategory = "Bowler", Status = "Active" },
                new() { FirstName = "KL", LastName = "Rahul", PlayerCategory = "Batsman", Status = "Active" },
                new() { FirstName = "Mohammed", LastName = "Shami", PlayerCategory = "Bowler", Status = "Active" },
                new() { FirstName = "Suryakumar", LastName = "Yadav", PlayerCategory = "Batsman", Status = "Active" },
                new() { FirstName = "Rishabh", LastName = "Pant", PlayerCategory = "Batsman", Status = "Active" },
                new() { FirstName = "Kuldeep", LastName = "Yadav", PlayerCategory = "Bowler", Status = "Active" }
            };

            await context.Players.AddRangeAsync(players);
            await context.SaveChangesAsync();

            // Roster for Royal Strikers (team1)
            await context.TeamPlayers.AddRangeAsync(
                new TeamPlayer { TeamId = team1.Id, PlayerId = players[0].Id, Status = "Active" },
                new TeamPlayer { TeamId = team1.Id, PlayerId = players[1].Id, Status = "Active" },
                new TeamPlayer { TeamId = team1.Id, PlayerId = players[2].Id, Status = "Active" },
                new TeamPlayer { TeamId = team1.Id, PlayerId = players[3].Id, Status = "Active" },
                new TeamPlayer { TeamId = team1.Id, PlayerId = players[4].Id, Status = "Active" }
            );

            // Roster for Thunder Kings (team2)
            await context.TeamPlayers.AddRangeAsync(
                new TeamPlayer { TeamId = team2.Id, PlayerId = players[5].Id, Status = "Active" },
                new TeamPlayer { TeamId = team2.Id, PlayerId = players[6].Id, Status = "Active" },
                new TeamPlayer { TeamId = team2.Id, PlayerId = players[7].Id, Status = "Active" },
                new TeamPlayer { TeamId = team2.Id, PlayerId = players[8].Id, Status = "Active" },
                new TeamPlayer { TeamId = team2.Id, PlayerId = players[9].Id, Status = "Active" }
            );

            await context.SaveChangesAsync();

            // 5. Seed Series
            var series = new Series
            {
                Name = "Box Cricket Premier League 2026",
                StartDate = DateTime.UtcNow.Date,
                EndDate = DateTime.UtcNow.Date.AddDays(7),
                Status = "InProgress",
                Description = "Premier 6-overs Box Cricket Tournament"
            };
            await context.Series.AddAsync(series);
            await context.SaveChangesAsync();

            // 6. Seed Match 1 (Completed with Full Scorecard)
            var match1 = new Match
            {
                SeriesId = series.Id,
                Team1Id = team1.Id,
                Team2Id = team2.Id,
                MatchOrder = 1,
                RequiredOvers = 6,
                ScheduledDate = DateTime.UtcNow.Date,
                ScheduledTime = "19:00",
                Address = "Surat Box Cricket Arena, Pitch 1",
                Status = "Completed",
                WinningTeamId = team1.Id,
                Result = "Royal Strikers won by 14 runs",
                MOMPlayerId = players[1].Id // Virat Kohli
            };
            await context.Matches.AddAsync(match1);
            await context.SaveChangesAsync();

            // Innings 1: Royal Strikers Batting (team1)
            var inn1 = new MatchInnings
            {
                MatchId = match1.Id,
                TeamId = team1.Id,
                InningsNumber = 1,
                Runs = 78,
                Wickets = 2,
                Balls = 36, // 6.0 overs
                Status = "Completed"
            };
            await context.MatchInnings.AddAsync(inn1);
            await context.SaveChangesAsync();

            // Innings 1 Batting
            await context.MatchBattingPerformances.AddRangeAsync(
                new MatchBattingPerformance
                {
                    MatchInningsId = inn1.Id,
                    PlayerId = players[0].Id, // Rohit
                    Runs = 24,
                    BallsFaced = 12,
                    Fours = 2,
                    Sixes = 2,
                    DotBalls = 2,
                    Ones = 4,
                    Twos = 2,
                    Threes = 0,
                    Fives = 0,
                    SixRunBalls = 2,
                    IsOut = true,
                    DismissalType = "Caught",
                    Bowled = false,
                    SixInRowCount = 1,
                    FourInRowCount = 0
                },
                new MatchBattingPerformance
                {
                    MatchInningsId = inn1.Id,
                    PlayerId = players[1].Id, // Virat
                    Runs = 42,
                    BallsFaced = 18,
                    Fours = 4,
                    Sixes = 3,
                    DotBalls = 1,
                    Ones = 6,
                    Twos = 4,
                    Threes = 0,
                    Fives = 0,
                    SixRunBalls = 3,
                    IsOut = false,
                    DismissalType = "NotOut",
                    Bowled = false,
                    SixInRowCount = 2,
                    FourInRowCount = 1
                },
                new MatchBattingPerformance
                {
                    MatchInningsId = inn1.Id,
                    PlayerId = players[3].Id, // Hardik
                    Runs = 12,
                    BallsFaced = 6,
                    Fours = 1,
                    Sixes = 1,
                    DotBalls = 1,
                    Ones = 2,
                    Twos = 1,
                    Threes = 0,
                    Fives = 0,
                    SixRunBalls = 1,
                    IsOut = true,
                    DismissalType = "Bowled",
                    Bowled = true,
                    SixInRowCount = 0,
                    FourInRowCount = 0
                }
            );

            // Innings 1 Bowling (team2 bowlers)
            await context.MatchBowlingPerformances.AddRangeAsync(
                new MatchBowlingPerformance
                {
                    MatchInningsId = inn1.Id,
                    PlayerId = players[6].Id, // Shami
                    BallsBowled = 18, // 3.0 overs
                    RunsConceded = 36,
                    Wickets = 1,
                    MaidenOvers = 0,
                    HatTricks = 0,
                    Wides = 1,
                    NoBalls = 0
                },
                new MatchBowlingPerformance
                {
                    MatchInningsId = inn1.Id,
                    PlayerId = players[9].Id, // Kuldeep
                    BallsBowled = 18, // 3.0 overs
                    RunsConceded = 42,
                    Wickets = 1,
                    MaidenOvers = 0,
                    HatTricks = 0,
                    Wides = 2,
                    NoBalls = 1
                }
            );

            // Innings 2: Thunder Kings Batting (team2 chasing 79)
            var inn2 = new MatchInnings
            {
                MatchId = match1.Id,
                TeamId = team2.Id,
                InningsNumber = 2,
                Runs = 64,
                Wickets = 4,
                Balls = 36, // 6.0 overs
                Status = "Completed"
            };
            await context.MatchInnings.AddAsync(inn2);
            await context.SaveChangesAsync();

            // Innings 2 Batting
            await context.MatchBattingPerformances.AddRangeAsync(
                new MatchBattingPerformance
                {
                    MatchInningsId = inn2.Id,
                    PlayerId = players[5].Id, // Rahul
                    Runs = 18,
                    BallsFaced = 11,
                    Fours = 2,
                    Sixes = 1,
                    DotBalls = 3,
                    Ones = 2,
                    Twos = 1,
                    Threes = 0,
                    Fives = 0,
                    SixRunBalls = 1,
                    IsOut = true,
                    DismissalType = "Bowled",
                    Bowled = true,
                    SixInRowCount = 0,
                    FourInRowCount = 0
                },
                new MatchBattingPerformance
                {
                    MatchInningsId = inn2.Id,
                    PlayerId = players[7].Id, // Surya
                    Runs = 32,
                    BallsFaced = 15,
                    Fours = 3,
                    Sixes = 2,
                    DotBalls = 2,
                    Ones = 4,
                    Twos = 2,
                    Threes = 0,
                    Fives = 0,
                    SixRunBalls = 2,
                    IsOut = true,
                    DismissalType = "Caught",
                    Bowled = false,
                    SixInRowCount = 1,
                    FourInRowCount = 0
                },
                new MatchBattingPerformance
                {
                    MatchInningsId = inn2.Id,
                    PlayerId = players[8].Id, // Pant
                    Runs = 14,
                    BallsFaced = 10,
                    Fours = 1,
                    Sixes = 1,
                    DotBalls = 3,
                    Ones = 3,
                    Twos = 1,
                    Threes = 0,
                    Fives = 0,
                    SixRunBalls = 1,
                    IsOut = false,
                    DismissalType = "NotOut",
                    Bowled = false,
                    SixInRowCount = 0,
                    FourInRowCount = 0
                }
            );

            // Innings 2 Bowling (team1 bowlers: Bumrah & Jadeja)
            await context.MatchBowlingPerformances.AddRangeAsync(
                new MatchBowlingPerformance
                {
                    MatchInningsId = inn2.Id,
                    PlayerId = players[2].Id, // Bumrah
                    BallsBowled = 18, // 3.0 overs
                    RunsConceded = 26,
                    Wickets = 3,
                    MaidenOvers = 1,
                    HatTricks = 1,
                    Wides = 0,
                    NoBalls = 0
                },
                new MatchBowlingPerformance
                {
                    MatchInningsId = inn2.Id,
                    PlayerId = players[4].Id, // Jadeja
                    BallsBowled = 18, // 3.0 overs
                    RunsConceded = 38,
                    Wickets = 1,
                    MaidenOvers = 0,
                    HatTricks = 0,
                    Wides = 1,
                    NoBalls = 0
                }
            );

            // 7. Seed Match 2 (Scheduled)
            var match2 = new Match
            {
                SeriesId = series.Id,
                Team1Id = team3.Id,
                Team2Id = team4.Id,
                MatchOrder = 2,
                RequiredOvers = 6,
                ScheduledDate = DateTime.UtcNow.Date.AddDays(1),
                ScheduledTime = "20:30",
                Address = "Surat Box Cricket Arena, Pitch 2",
                Status = "Scheduled"
            };
            await context.Matches.AddAsync(match2);

            await context.SaveChangesAsync();
        }
    }
}
