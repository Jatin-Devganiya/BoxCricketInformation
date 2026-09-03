# Database Design --- Cricket Statistics Application

## 1. Design Goal

Use SQL Server with a normalized relational schema.

The database must preserve historical match and player statistics.

## 2. Tables

### Users

  Column         Type           Notes
  -------------- -------------- -----------------
  Id             int/bigint     PK
  FirstName      nvarchar       Required
  LastName       nvarchar       Required
  Username       nvarchar       Unique
  PasswordHash   nvarchar       Never expose
  Status         nvarchar/int   Active/Inactive
  CreatedAt      datetime2      Required
  UpdatedAt      datetime2      Required

### Roles

  Column   Type
  -------- ----------
  Id       int
  Name     nvarchar

Seed:

-   Admin
-   User

### UserRoles

  Column   Type
  -------- ------
  UserId   FK
  RoleId   FK

Use a composite primary key if users may have multiple roles.

### Players

  Column           Type           Notes
  ---------------- -------------- -----------------
  Id               int/bigint     PK
  FirstName        nvarchar       Required
  LastName         nvarchar       Required
  Status           nvarchar/int   Active/Inactive
  PlayerCategory   nvarchar/int   Batsman/Bowler
  CreatedAt        datetime2      
  UpdatedAt        datetime2      

If application users need to be linked to players, add nullable UserId
FK rather than duplicating authentication fields.

### Teams

  Column      Type
  ----------- --------------
  Id          int/bigint
  Name        nvarchar
  ShortName   nvarchar
  Status      nvarchar/int
  CreatedAt   datetime2
  UpdatedAt   datetime2

### TeamPlayers

  Column       Type
  ------------ ---------------
  TeamId       FK
  PlayerId     FK
  JoinedDate   date
  LeftDate     date nullable
  Status       nvarchar/int

### Series

  Column        Type
  ------------- --------------
  Id            int/bigint
  Name          nvarchar
  StartDate     date
  EndDate       date
  Status        nvarchar/int
  Description   nvarchar
  CreatedAt     datetime2
  UpdatedAt     datetime2

### Matches

  Column          Type
  --------------- ----------------
  Id              int/bigint
  SeriesId        FK
  Team1Id         FK
  Team2Id         FK
  MatchOrder      int
  ScheduledDate   date/datetime2
  ScheduledTime   time
  Address         nvarchar
  Status          nvarchar/int
  WinningTeamId   FK nullable
  Result          nvarchar
  CreatedAt       datetime2
  UpdatedAt       datetime2

Constraint:

Team1Id != Team2Id

### MatchInnings

  Column          Type
  --------------- --------------
  Id              int/bigint
  MatchId         FK
  TeamId          FK
  InningsNumber   int
  Runs            int
  Wickets         int
  Balls           int
  Status          nvarchar/int

Unique:

(MatchId, InningsNumber)

### MatchBattingPerformances

  Column           Type
  ---------------- ------------
  Id               int/bigint
  MatchInningsId   FK
  PlayerId         FK
  Runs             int
  BallsFaced       int
  Fours            int
  Sixes            int
  DotBalls         int
  Ones             int
  Twos             int
  Threes           int
  Fives            int
  SixRunBalls      int
  IsOut            bit
  DismissalType    nvarchar
  Bowled           bit
  SixInRowCount    int
  FourInRowCount   int

If Fours/Sixes represent boundaries, don't accidentally count them again
as generic 4/6 run balls without defining the distinction.

### MatchBowlingPerformances

  Column           Type
  ---------------- ------------
  Id               int/bigint
  MatchInningsId   FK
  PlayerId         FK
  BallsBowled      int
  RunsConceded     int
  Wickets          int
  MaidenOvers      int
  HatTricks        int
  Wides            int
  NoBalls          int

## 3. Indexes

Recommended:

-   Users.Username
-   Players.LastName
-   Teams.Name
-   Series.StartDate
-   Matches.SeriesId
-   Matches.ScheduledDate
-   MatchInnings.MatchId
-   MatchBattingPerformances.PlayerId
-   MatchBowlingPerformances.PlayerId

## 4. Delete Strategy

Historical data should generally use soft deletion/status.

Avoid cascading deletes that can remove scorecard history unexpectedly.

## 5. Aggregate Statistics

Do not create a PlayerTotals table in version 1 unless performance
proves that calculated queries are insufficient.

Use SQL/EF queries or a statistics service to aggregate:

SUM COUNT MAX

from match performance records.

If later required for performance, introduce a cached aggregate table
with a controlled refresh strategy.

## 6. Security

Passwords are represented only by PasswordHash.

Never create:

Password nvarchar

Never return PasswordHash from an API DTO.

## 7. Migration Strategy

Use EF Core migrations.

Every schema change must have a migration.

Never manually modify production tables without documenting the change.
