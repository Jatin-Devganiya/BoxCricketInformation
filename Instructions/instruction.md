# AI Assistant Instructions --- Cricket Statistics Web Application

## IMPORTANT

You are working as the primary development assistant for this project.

Read this file and `skill.md` before making any implementation decision.

The application is a React.js + ASP.NET Core Web API + SQL Server web
application.

The primary goal is to build a simple and maintainable cricket
information/statistics system.

------------------------------------------------------------------------

# 1. Project Objective

Create a web application that allows users to manage:

-   Players
-   Teams
-   Series
-   Matches
-   Match scorecards
-   Batting statistics
-   Bowling statistics
-   Player aggregate statistics

The system also has application users with two roles:

-   Admin
-   User

------------------------------------------------------------------------

# 2. Permission Matrix

  Feature                  Admin   User   Viewer
  ------------------------ ------- ------ --------
  Login                    Yes     Yes    Yes
  View players             Yes     Yes    Yes
  View player statistics   Yes     Yes    Yes
  View teams               Yes     Yes    Yes
  View series              Yes     Yes    Yes
  View matches             Yes     Yes    Yes
  CRUD users               Yes     No     No
  CRUD players             Yes     No     No
  CRUD teams               Yes     No     No
  CRUD series              Yes     Yes    No
  CRUD matches             Yes     Yes    No
  Manage scorecard         Yes     Yes    No

If the project requirements later change, update this matrix and related
authorization rules.

------------------------------------------------------------------------

# 3. Required Modules

Build these modules in this approximate order:

1.  Project setup
2.  SQL Server database
3.  Backend architecture
4.  Authentication
5.  User/role management
6.  Player management
7.  Team management
8.  Series management
9.  Match management
10. Match scorecard
11. Player batting statistics
12. Player bowling statistics
13. Aggregate statistics
14. Dashboard
15. Validation/error handling
16. Testing
17. Final cleanup/documentation

Do not implement everything at once.

------------------------------------------------------------------------

# 4. Development Sequence

## Step 1 --- Inspect Environment

Before creating anything:

-   Check installed Node.js version.
-   Check npm version.
-   Check .NET SDK version.
-   Check SQL Server availability.
-   Inspect the repository.
-   Determine whether a React project already exists.
-   Determine whether an ASP.NET Core project already exists.

Do not overwrite an existing project without checking.

------------------------------------------------------------------------

## Step 2 --- Create Solution Structure

Preferred structure:

/client /server /database /docs

Backend:

/server /CricketApp.Api /CricketApp.Application /CricketApp.Domain
/CricketApp.Infrastructure /CricketApp.Tests

If this is too complex for the existing project, use a simpler
structure:

/server /Controllers /Services /Data /Models /DTOs /Middleware

Choose simplicity over architecture for its own sake.

------------------------------------------------------------------------

# 5. Database Design

Create relational tables for:

### Users

-   Id
-   FirstName
-   LastName
-   Username
-   PasswordHash
-   Status
-   CreatedAt
-   UpdatedAt

### Roles

-   Id
-   Name

### UserRoles

-   UserId
-   RoleId

### Players

-   Id
-   FirstName
-   LastName
-   Username if the player is linked to an application user
-   Status
-   PlayerCategory
-   CreatedAt
-   UpdatedAt

Important:

Do not use the player's password as part of the player table.

Application authentication belongs to Users.

### Teams

-   Id
-   Name
-   ShortName
-   Status
-   CreatedAt
-   UpdatedAt

### TeamPlayers

-   TeamId
-   PlayerId
-   JoinedDate
-   LeftDate if required
-   Status

### Series

-   Id
-   Name
-   StartDate
-   EndDate
-   Status
-   Description
-   CreatedAt
-   UpdatedAt

### Matches

-   Id
-   SeriesId
-   Team1Id
-   Team2Id
-   MatchOrder
-   ScheduledDate
-   ScheduledTime
-   Address
-   Status
-   WinningTeamId
-   Result
-   CreatedAt
-   UpdatedAt

### MatchInnings

-   Id
-   MatchId
-   TeamId
-   InningsNumber
-   Runs
-   Wickets
-   Balls
-   Status

### MatchBattingPerformances

-   Id
-   MatchInningsId
-   PlayerId
-   Runs
-   BallsFaced
-   Fours
-   Sixes
-   DotBalls
-   Ones
-   Twos
-   Threes
-   FoursByBallCount if separate from boundary count
-   Fives
-   SixesByBallCount
-   IsOut
-   DismissalType
-   Bowled
-   SixInRowCount
-   FourInRowCount

### MatchBowlingPerformances

-   Id
-   MatchInningsId
-   PlayerId
-   BallsBowled
-   RunsConceded
-   Wickets
-   MaidenOvers
-   HatTricks
-   Wides
-   NoBalls

Column names may be improved during implementation if a clearer domain
name is available.

------------------------------------------------------------------------

# 6. Important Statistics Decision

For the first version, do NOT build a ball-by-ball engine.

The scorecard entry should allow a scorer/admin/user to enter
player-level performance.

This keeps version 1 simple.

Later, the system can add:

BallEvents:

-   InningsId
-   OverNumber
-   BallNumber
-   BowlerId
-   StrikerId
-   NonStrikerId
-   RunsOffBat
-   Extras
-   Wicket
-   WicketType

If ball-by-ball scoring is requested later, derive player statistics
from BallEvents.

------------------------------------------------------------------------

# 7. Cricket Statistics

## Batting

Track per match/innings:

-   Runs
-   Balls faced
-   Fours
-   Sixes
-   Dot balls
-   1-run balls
-   2-run balls
-   3-run balls
-   4-run balls
-   5-run balls
-   6-run balls
-   Sixes in a row
-   Four boundaries in a row
-   IsOut
-   Dismissal type

Calculate:

-   Run rate
-   Highest score
-   Total runs
-   Total matches
-   Total innings
-   Zero-out count

## Bowling

Track per match/innings:

-   Balls bowled
-   Runs conceded
-   Wickets
-   Maiden overs
-   Hat tricks
-   Wides
-   No balls

Calculate:

-   Overs
-   Bowling run rate
-   Highest wickets
-   Total matches
-   Total innings

------------------------------------------------------------------------

# 8. Cricket Overs Rule

Never treat cricket overs as ordinary decimal numbers.

Example:

6 legal balls = 1 over 12 legal balls = 2 overs 11 legal balls = 1
over + 5 balls = display as 1.5

If storing overs as a numeric decimal is unavoidable, clearly document
the representation.

Prefer:

BallsBowled = 11

Then:

Overs = 1.5 cricket notation

For calculations:

OversDecimal = BallsBowled / 6

------------------------------------------------------------------------

# 9. Series Requirement

The user wants a series to contain the matches played during a
particular period/day.

Example:

Series: Name: September 3 Cricket Series StartDate: 2026-09-03 EndDate:
2026-09-03

Matches:

Match 1 Match 2 Match 3 ...

At the end of the day the series can show:

-   Total matches
-   Completed matches
-   Cancelled matches
-   Scheduled matches
-   Total participating teams
-   Player statistics

Do not delete or recreate the series when the date changes.

------------------------------------------------------------------------

# 10. API Development Rules

Use DTOs.

Do not expose:

-   PasswordHash
-   Internal security data
-   EF tracking objects

Recommended endpoints:

Authentication:

POST /api/auth/login

Users:

GET /api/users GET /api/users/{id} POST /api/users PUT /api/users/{id}
DELETE /api/users/{id}

Players:

GET /api/players GET /api/players/{id} POST /api/players PUT
/api/players/{id} DELETE /api/players/{id} GET
/api/players/{id}/statistics

Teams:

GET /api/teams GET /api/teams/{id} POST /api/teams PUT /api/teams/{id}
DELETE /api/teams/{id}

Series:

GET /api/series GET /api/series/{id} POST /api/series PUT
/api/series/{id} DELETE /api/series/{id}

Matches:

GET /api/matches GET /api/matches/{id} POST /api/matches PUT
/api/matches/{id} DELETE /api/matches/{id}

Scorecard:

GET /api/matches/{id}/scorecard POST /api/matches/{id}/scorecard PUT
/api/matches/{id}/scorecard

Adjust endpoints to match the actual implementation.

------------------------------------------------------------------------

# 11. Frontend Pages

Create:

-   Login
-   Dashboard
-   Players
-   Player Details
-   Teams
-   Team Details
-   Series
-   Series Details
-   Matches
-   Match Details
-   Match Scorecard
-   Users

Admin-only:

-   User Management

------------------------------------------------------------------------

# 12. Dashboard

Keep the dashboard simple.

Show cards such as:

-   Total Players
-   Total Teams
-   Total Series
-   Total Matches
-   Completed Matches
-   Today's Matches

Optionally show:

-   Recent matches
-   Current series
-   Top run scorer
-   Top wicket taker

Do not make the dashboard overly complex.

------------------------------------------------------------------------

# 13. Player Details Page

Display:

Basic information:

-   Name
-   Username
-   Category
-   Status
-   Teams

Statistics:

### Batting

-   Matches
-   Innings
-   Runs
-   Highest Score
-   Run Rate
-   Fours
-   Sixes
-   Dot Balls
-   Zero Outs
-   1-run count
-   2-run count
-   3-run count
-   4-run count
-   5-run count
-   6-run count
-   Six-in-row
-   Four-boundaries-in-row

### Bowling

-   Matches
-   Innings
-   Overs
-   Wickets
-   Run Rate
-   Highest Wickets
-   Maiden Overs
-   Hat Tricks
-   Wides
-   No Balls

Provide tabs or sections so the page does not become cluttered.

------------------------------------------------------------------------

# 14. Match Scorecard UI

Match page should show:

-   Series
-   Match order
-   Date/time
-   Venue/address
-   Team 1
-   Team 2
-   Status
-   Result

Scorecard:

Team 1 batting Team 2 bowling

Team 2 batting Team 1 bowling

For each player show relevant performance fields.

Use a modal or dedicated scorecard editor.

------------------------------------------------------------------------

# 15. Add Match Form

Fields:

-   Series
-   Team 1
-   Team 2
-   Match Order
-   Match Date
-   Time
-   Address/Venue
-   Status

Rules:

-   Series required
-   Team 1 required
-   Team 2 required
-   Team 1 != Team 2
-   Match order must be valid
-   Date required
-   Time required

------------------------------------------------------------------------

# 16. Add Player Form

Fields:

-   First Name
-   Last Name
-   Username if applicable
-   Player Category
-   Status

Player category:

-   Batsman
-   Bowler

Do not put application password fields in the cricket player form unless
the player is also being created as an application user.

------------------------------------------------------------------------

# 17. Add User Form

Admin only.

Fields:

-   First Name
-   Last Name
-   Username
-   Password
-   Role
-   Status

Roles:

-   Admin
-   User

Password:

-   Never store plain text.
-   Hash on the backend.
-   Never return password hash to frontend.

------------------------------------------------------------------------

# 18. UI Rules

Use:

-   Left sidebar
-   Header
-   Main content
-   Footer if useful
-   Tables
-   Modals
-   Search
-   Filters
-   Pagination
-   Confirmation dialogs
-   Toast/alert messages

The application should be usable on desktop and tablet.

Avoid unnecessary complexity.

------------------------------------------------------------------------

# 19. Security

Mandatory:

-   Password hashing
-   JWT authentication
-   Role authorization
-   Server-side validation
-   SQL parameterization/EF Core
-   No passwords in logs
-   No passwords in API responses
-   Proper CORS configuration
-   Avoid storing secrets directly in source code

Use configuration/environment variables for:

-   SQL connection string
-   JWT secret
-   JWT issuer/audience
-   Other secrets

------------------------------------------------------------------------

# 20. Error Handling

Backend should have centralized exception handling.

Frontend should handle:

-   400 validation error
-   401 unauthorized
-   403 forbidden
-   404 not found
-   409 conflict
-   500 server error

Show friendly messages.

Never show raw exception stack traces.

------------------------------------------------------------------------

# 21. CRUD Behavior

For every CRUD module:

List:

-   Search
-   Filter where useful
-   Pagination if data grows

Create:

-   Validation
-   Save
-   Success message
-   Refresh list

Read:

-   Details page/modal

Update:

-   Pre-populated form
-   Validation
-   Save

Delete:

-   Confirmation
-   Dependency validation
-   Success/error message

------------------------------------------------------------------------

# 22. Historical Data Protection

Completed matches and scorecards are historical data.

Do not allow careless deletion that removes historical statistics.

Prefer inactive/soft-delete behavior.

If deletion is allowed, check dependencies first.

------------------------------------------------------------------------

# 23. Code Quality

Do not:

-   Put business logic in controllers
-   Put database queries directly in React components
-   Duplicate calculations
-   Hardcode URLs
-   Hardcode role names throughout the application
-   Store passwords in plain text
-   Ignore API errors
-   Ignore validation

Do:

-   Reuse components
-   Use services
-   Use DTOs
-   Use dependency injection
-   Use constants/configuration
-   Keep methods focused
-   Keep naming consistent

------------------------------------------------------------------------

# 24. How the AI Must Work

When asked to implement a feature:

### Phase A --- Understand

1.  Read `skill.md`.
2.  Read this file.
3.  Inspect the relevant project files.
4.  Identify dependencies.
5.  Explain the implementation plan briefly.

### Phase B --- Implement

1.  Update database/model.
2.  Update migration.
3.  Update backend API.
4.  Update authorization if needed.
5.  Update frontend API service.
6.  Update frontend UI.
7.  Add validation.
8.  Add error handling.

### Phase C --- Verify

Run:

-   Backend build
-   Backend tests
-   Frontend build
-   Lint if configured

Fix errors before considering the feature complete.

### Phase D --- Report

Tell the user:

-   What changed
-   Files changed
-   Database changes
-   API changes
-   Frontend changes
-   How to run
-   How to test
-   Any assumptions

------------------------------------------------------------------------

# 25. Do Not Over-Engineer

Version 1 must remain simple.

Do not introduce:

-   Microservices
-   Event buses
-   Kubernetes
-   Redis
-   Message queues
-   Complex CQRS
-   Complex domain-event architecture

unless explicitly requested.

A modular monolith is preferred for this project.

------------------------------------------------------------------------

# 26. Important Ambiguities

If the user has not defined something, use these defaults:

-   Match status: Scheduled, InProgress, Completed, Abandoned, Cancelled
-   Player status: Active, Inactive
-   User status: Active, Inactive
-   Player categories: Batsman, Bowler
-   Application roles: Admin, User
-   SQL Server
-   JWT
-   EF Core
-   React Router
-   REST API

Clearly mention assumptions when they matter.

------------------------------------------------------------------------

# 27. Future Extension Compatibility

Design so these can be added later:

-   All-rounder
-   Wicketkeeper
-   Ball-by-ball scoring
-   Tournament
-   Player photos
-   Team logos
-   Player rankings
-   Leaderboards
-   Multiple innings formats
-   T20/ODI/Test
-   Export to Excel/PDF
-   Audit history
-   Notifications
-   Mobile app

Do not implement these unless requested.

------------------------------------------------------------------------

# 28. Final Principle

Build a working, simple cricket application first.

Correctness, maintainability, security, and ease of use are more
important than adding many features.

Never make a large unrelated refactor while implementing a small
feature.
