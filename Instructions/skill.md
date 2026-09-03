# Cricket Statistics Web Application --- AI Development Skill

## 1. Purpose

You are an AI software-development assistant working on a simple cricket
statistics web application.

Your responsibility is to help design, implement, review, debug,
refactor, test, and document the application while preserving the
project architecture and business rules defined in this repository.

The application is a web application, not an APK/mobile application.

## 2. Technology Stack

Use this stack unless the user explicitly changes it:

-   Frontend: React.js
-   Backend: ASP.NET Core Web API
-   Database: Microsoft SQL Server
-   ORM/data access: Entity Framework Core unless an existing project
    requires another approach
-   Authentication: ASP.NET Core authentication with JWT
-   Authorization: role-based authorization
-   API format: REST/JSON
-   Frontend HTTP client: fetch or Axios, preferring the package already
    present
-   Frontend routing: React Router
-   Styling: simple responsive CSS or an existing UI library already
    installed
-   Backend logging: ASP.NET Core logging; use Serilog only if already
    configured or explicitly requested

Do not introduce unnecessary frameworks or libraries.

## 3. Product Goal

Build a simple, clean, responsive cricket information and statistics
application.

The application stores:

-   Players
-   Teams
-   Series
-   Matches
-   Match scorecards
-   Player batting performance
-   Player bowling performance
-   Aggregated player statistics
-   User accounts and roles

The application must be easy to understand and operate for a
non-technical user.

## 4. User Roles

### Admin

Admin can:

-   Login
-   CRUD registered users
-   CRUD players
-   CRUD teams
-   CRUD series
-   CRUD matches
-   Manage match scorecards
-   View player statistics
-   View series information
-   View match information

### User

Normal users can:

-   Login
-   CRUD series
-   CRUD matches
-   Manage scorecard information where the application permits it
-   View players
-   View player statistics
-   View teams
-   View series
-   View matches

### Public/Authenticated Viewer

Any authenticated user can view:

-   Player details
-   Player statistics
-   Series details
-   Match details
-   Match scorecards

Do not expose passwords in any UI or API response.

## 5. Core Cricket Hierarchy

Use this relationship:

Series -\> Matches -\> Teams -\> Players -\> Match Scorecard -\> Batting
performance -\> Bowling performance

A series contains multiple matches.

A match belongs to one series.

A match has exactly two teams.

A team contains multiple players.

A player may participate in many matches.

A player may participate for different teams over time if the business
rules permit it.

## 6. Series Rules

A series contains at minimum:

-   Id
-   Name
-   StartDate
-   EndDate
-   Status
-   Description/Notes
-   CreatedAt
-   UpdatedAt

Example:

"Today Cricket Series" StartDate = current date EndDate = current date

If a series is intended to represent one day's play, all matches played
during that day belong to that series.

Do not automatically create duplicate series for the same date unless
explicitly required.

Recommended statuses:

-   Scheduled
-   InProgress
-   Completed
-   Cancelled

## 7. Match Rules

A match contains:

-   Id
-   SeriesId
-   Team1Id
-   Team2Id
-   MatchOrder
-   ScheduledDate
-   ScheduledTime
-   Venue/Address
-   Status
-   Toss information if required later
-   WinningTeamId if completed
-   Result/Notes
-   CreatedAt
-   UpdatedAt

A match must reference exactly two different teams.

Recommended statuses:

-   Scheduled
-   InProgress
-   Completed
-   Abandoned
-   Cancelled

Validate that Team1 and Team2 are different.

## 8. Player Rules

Player registration/basic details:

-   Id
-   FirstName
-   LastName
-   Username
-   Password
-   Status
-   Role
-   CreatedAt
-   UpdatedAt

Important distinction:

The application has two concepts that should not be confused:

1.  Application user role:
    -   Admin
    -   User
2.  Cricket player category:
    -   Batsman
    -   Bowler

A person can have an application account and also be a cricket player,
but these concepts should be modeled separately where practical.

For security, passwords must never be stored as plain text. Store a
strong password hash using the backend authentication/password-hashing
mechanism.

Recommended player status:

-   Active
-   Inactive

## 9. Cricket Player Categories

The initial cricket player category is:

-   Batsman
-   Bowler

Design the database so more categories can be added later, such as:

-   AllRounder
-   WicketKeeper

Do not force an all-rounder implementation into the first version unless
requested.

## 10. Batting Statistics

Track batting statistics per player per match/innings and aggregate
totals.

Required batting metrics:

-   Matches
-   Innings
-   Runs
-   Bowled/Out count as applicable to the business definition
-   Fours
-   Sixes
-   Run Rate
-   Highest Runs
-   Zero-out count
-   Dot balls
-   Number of 1-run scoring balls
-   Number of 2-run scoring balls
-   Number of 3-run scoring balls
-   Number of 4-run scoring balls
-   Number of 5-run scoring balls
-   Number of 6-run scoring balls
-   Sixes in a row count
-   Four boundaries in a row count

Important implementation rule:

Do not store values that can be reliably calculated from detailed
scorecard events unless there is a strong reason to persist them.

For the first version, use a match batting record containing the values
entered by the scorer. Aggregated player statistics should preferably be
calculated from match records or maintained through a controlled
service.

Define "bowled" explicitly in the UI/database. If it means
"dismissed/bowled out", use a clear field such as IsOut and/or
DismissalType rather than an ambiguous column named Bowled.

Run rate should be calculated consistently:

RunRate = Runs / OversFaced

For batting, balls faced should be available if run rate is based on
balls.

## 11. Bowling Statistics

Track bowling statistics per player per match/innings and aggregate
totals.

Required bowling metrics:

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

For bowling run rate:

BowlingRunRate = RunsConceded / OversBowled

Overs must be handled correctly for cricket notation.

Example:

1.5 overs means 1 over and 5 legal balls, not decimal 1.5 overs.

Internally, consider storing BallsBowled and calculating OversDisplay
from legal balls.

## 12. Match Scorecard

Each match must have a scorecard.

The scorecard must support:

-   Team 1 batting
-   Team 1 bowling
-   Team 2 batting
-   Team 2 bowling
-   Player-level batting records
-   Player-level bowling records
-   Innings
-   Runs
-   Wickets
-   Overs
-   Extras
-   Match result

At minimum, support the player statistics requested by the product
owner.

Do not attempt a full professional cricket scoring engine in the first
version unless explicitly requested.

## 13. Database Design Principles

Prefer normalized relational tables.

Suggested tables:

-   Users
-   Roles
-   UserRoles
-   Players
-   Teams
-   TeamPlayers
-   Series
-   Matches
-   MatchInnings
-   MatchBattingPerformances
-   MatchBowlingPerformances

Optional later tables:

-   BallEvents
-   PlayerDismissals
-   MatchExtras
-   AuditLogs

Use foreign keys and indexes.

Use unique constraints where appropriate, such as:

-   User.Username
-   Team name if business rules require uniqueness
-   Series/match identifiers as appropriate

Do not duplicate calculated aggregate statistics unnecessarily.

## 14. API Principles

Use clear REST endpoints.

Example:

GET /api/players GET /api/players/{id} POST /api/players PUT
/api/players/{id} DELETE /api/players/{id}

GET /api/series GET /api/series/{id} POST /api/series PUT
/api/series/{id} DELETE /api/series/{id}

GET /api/matches GET /api/matches/{id} POST /api/matches PUT
/api/matches/{id} DELETE /api/matches/{id}

GET /api/matches/{id}/scorecard POST /api/matches/{id}/scorecard

GET /api/players/{id}/statistics

GET /api/teams GET /api/teams/{id}

POST /api/auth/login

Use DTOs rather than exposing EF entities directly.

Return proper HTTP status codes.

Validate all input on the server.

## 15. Authentication and Authorization

Login should return a JWT/access token.

Frontend should store authentication state securely according to the
application's threat model.

Every protected API endpoint must enforce authorization on the server.

Never rely only on hiding buttons in React.

Example:

\[Authorize(Roles = "Admin")\]

Use role checks for administrative operations.

Frontend should also hide/disable unauthorized controls for good UX.

## 16. Frontend Structure

Prefer a simple structure such as:

src/ components/ pages/ layouts/ services/ hooks/ context/ routes/
utils/ styles/

Recommended pages:

-   Login
-   Dashboard
-   Players
-   Player Details
-   Teams
-   Series
-   Series Details
-   Matches
-   Match Details
-   Match Scorecard
-   Users/Admin Users

Use reusable components for:

-   Table
-   Search
-   Pagination
-   Modal
-   Confirmation dialog
-   Form
-   Dropdown
-   Status badge
-   Loading state
-   Error message
-   Empty state

## 17. UI/UX Rules

Keep the UI simple.

Use:

-   Header
-   Left sidebar
-   Main content area
-   Responsive layout
-   Clear page titles
-   Add button
-   Search/filter
-   Edit/delete actions
-   Confirmation before delete
-   Validation messages
-   Loading indicators
-   Success/error notifications

Avoid:

-   Unnecessary animations
-   Overly complex dashboards
-   Excessive colors
-   Deep navigation
-   Huge forms without sections

## 18. Validation Rules

Frontend validation improves UX, but backend validation is mandatory.

Examples:

-   First name required
-   Last name required
-   Username required and unique
-   Password required when creating a user
-   Series name required
-   Series dates valid
-   Match must have a series
-   Team 1 and Team 2 required
-   Team 1 != Team 2
-   Match date required
-   Match order must be valid
-   Numeric cricket statistics cannot be negative
-   Wickets cannot exceed valid innings limits
-   Overs cannot contain invalid cricket-ball notation
-   Player cannot be duplicated in the same team assignment

## 19. Statistics Calculation

Create a dedicated statistics service.

Examples:

Player total matches: Count distinct completed match participation
records.

Total runs: SUM(match batting runs)

Highest score: MAX(match batting runs)

Total fours: SUM(fours)

Total sixes: SUM(sixes)

Total wickets: SUM(wickets)

Highest wickets: MAX(wickets in a match/innings)

Total maiden overs: SUM(maiden overs)

Do not calculate statistics from UI state.

Keep calculation logic in backend services.

## 20. Daily Series Requirement

The product owner wants to count matches played at the end of each day.

Recommended implementation:

-   Series has StartDate and EndDate.
-   Each match has ScheduledDate.
-   Completed matches are associated with their series.
-   Dashboard can show:
    -   Total matches in series
    -   Completed matches
    -   Scheduled matches
    -   Cancelled matches

Do not silently change historical data when the date changes.

## 21. Error Handling

Backend should return consistent error responses.

Example:

{ "message": "Validation failed", "errors": { "team2Id": \["Team 2 is
required."\] } }

Frontend should show human-readable errors.

Do not display stack traces to users.

Log unexpected server exceptions.

## 22. Delete Rules

Prefer soft delete for important historical records such as:

-   Players
-   Teams
-   Series
-   Matches

If hard delete is implemented, prevent deletion when dependent
historical records exist.

Never allow deleting a record that would silently corrupt scorecard
history.

## 23. Testing

Create tests for:

-   Authentication
-   Authorization
-   Player CRUD
-   Team CRUD
-   Series CRUD
-   Match CRUD
-   Match validation
-   Scorecard creation
-   Batting calculations
-   Bowling calculations
-   Aggregate statistics

At minimum, test important business rules on the backend.

## 24. Development Behavior

Before changing code:

1.  Inspect the repository.
2.  Understand the existing architecture.
3.  Reuse existing patterns.
4.  Avoid unnecessary rewrites.
5.  Identify dependencies.
6.  Check database relationships.
7.  Check authorization.
8.  Implement the smallest complete change.
9.  Build/test.
10. Report what changed.

Never invent files/classes that already exist without checking.

## 25. Coding Standards

Backend:

-   PascalCase for public C# members
-   Async methods should use Async suffix
-   Use cancellation tokens where appropriate
-   Use dependency injection
-   Use DTOs
-   Keep controllers thin
-   Put business logic in services
-   Use meaningful exception handling
-   Avoid magic strings
-   Avoid duplicated business logic

Frontend:

-   Use functional React components
-   Use clear component names
-   Keep API calls in service modules
-   Avoid putting large API implementations directly inside JSX
-   Reuse form/table components
-   Handle loading/error/empty states
-   Keep components reasonably small

## 26. Database Migration

Use EF Core migrations unless the project explicitly uses
database-first.

Never destroy production data during development.

Before applying a destructive migration:

-   Explain the change
-   Confirm data impact
-   Prefer backward-compatible migration

## 27. Definition of Done

A feature is not complete until:

-   UI is implemented
-   API is implemented
-   Database changes are implemented
-   Validation exists
-   Authorization is correct
-   Error handling exists
-   Loading/empty states exist
-   CRUD works end-to-end
-   Relevant tests/build pass
-   Existing functionality is not broken
-   Documentation is updated when architecture changes

## 28. AI Assistant Rule

When the user asks for implementation:

-   Do not only provide pseudocode if actual project code can be
    written.
-   First inspect the project.
-   Make changes in logical small steps.
-   Explain files changed.
-   Mention commands needed to run/test.
-   If something is ambiguous, choose the simplest reasonable
    implementation and clearly state the assumption.
-   Do not over-engineer the first version.
