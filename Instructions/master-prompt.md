# Master Prompt --- Cricket Statistics Web Application

You are the primary AI software-development assistant for this project.

Before doing any implementation work, read:

1.  `skill.md`
2.  `instruction.md`
3.  `project-context.md`
4.  `database-design.md`
5.  `api-contract.md`

Use `development-checklist.md` to track progress.

## Project

We are building a simple, responsive cricket statistics web application.

Technology:

-   React.js frontend
-   ASP.NET Core Web API backend
-   Microsoft SQL Server database
-   Entity Framework Core
-   JWT authentication
-   Role-based authorization

This is a web application. Do not build an APK/mobile application unless
explicitly requested later.

## Business Requirements

The system manages:

-   Application users
-   Roles
-   Players
-   Teams
-   Series
-   Matches
-   Match scorecards
-   Batting performance
-   Bowling performance
-   Player aggregate statistics

Application roles:

-   Admin
-   User

Cricket player categories:

-   Batsman
-   Bowler

Admin can CRUD users, players, teams, series and matches.

Normal users can CRUD series and matches.

Authenticated users can view player details/statistics, teams, series,
matches and scorecards.

## Cricket Structure

Series -\> Matches -\> Each match has two teams -\> Teams have players
-\> Matches have innings -\> Innings have batting and bowling
performances

A series can represent one day or a date range.

A single-day series has the same start and end date.

Completed matches remain historical records.

## Batting Statistics

Per match/innings:

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
-   DismissalType
-   Bowled where explicitly required

Aggregate:

-   Matches
-   Innings
-   Runs
-   Highest runs
-   Run rate
-   Fours
-   Sixes
-   Zero-out count
-   All requested scoring-pattern counts

## Bowling Statistics

Per match/innings:

-   Balls bowled
-   Runs conceded
-   Wickets
-   Maiden overs
-   Hat tricks
-   Wides
-   No balls

Aggregate:

-   Matches
-   Innings
-   Overs
-   Wickets
-   Run rate
-   Highest wickets
-   Maiden overs
-   Hat tricks
-   Wides
-   No balls

## Cricket Overs

Do not treat cricket overs as ordinary decimal numbers.

Prefer storing legal balls.

Examples:

6 balls = 1 over 11 balls = 1 over + 5 balls

Display cricket notation correctly.

## Important Security Rule

The original requirement mentions user password fields, but never store
a plain-text password.

Use:

PasswordHash

not:

Password

Never return password hashes to React.

Never log passwords.

JWT secrets and SQL connection strings must be supplied through secure
configuration/environment variables.

## Version 1 Scope

Keep version 1 simple.

Do not build ball-by-ball scoring initially.

Store player-level match performance.

A future version may add ball-by-ball events and derive statistics
automatically.

Do not introduce unnecessary technologies such as:

-   Microservices
-   Kubernetes
-   Redis
-   RabbitMQ
-   CQRS
-   Event sourcing

unless explicitly requested.

## Required Pages

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
-   User Management

## UI

Use a simple layout:

Header Sidebar Main Content Optional Footer

The UI must be:

-   Clean
-   Responsive
-   Easy to understand
-   Easy to navigate
-   Suitable for desktop/tablet
-   Not overloaded with unnecessary features

## Development Process

Always work in phases.

### Phase 1

Inspect the repository and environment.

Report:

-   Existing files
-   Existing projects
-   Node version
-   .NET version
-   SQL Server setup
-   Existing dependencies
-   Existing database configuration

Do not overwrite existing work.

### Phase 2

Design and implement the database.

Create:

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

Create EF Core migrations.

### Phase 3

Implement authentication and authorization.

### Phase 4

Implement CRUD APIs.

### Phase 5

Implement React UI.

### Phase 6

Implement scorecard.

### Phase 7

Implement player statistics.

### Phase 8

Implement dashboard and final UX.

### Phase 9

Test everything.

## AI Behavior

Before coding:

-   Inspect existing code.
-   Identify the correct files.
-   Explain the plan briefly.
-   Ask for clarification only when a decision materially affects the
    data model or business behavior.
-   Otherwise use the documented defaults.

During coding:

-   Make small, logical changes.
-   Reuse existing patterns.
-   Avoid unnecessary dependencies.
-   Keep controllers thin.
-   Put business logic in services.
-   Keep React API calls in service modules.
-   Use DTOs.
-   Validate on both frontend and backend.
-   Enforce authorization on the backend.

After coding:

-   Build backend.
-   Build frontend.
-   Run tests.
-   Fix compile errors.
-   Fix obvious runtime/API issues.
-   Update documentation if required.

Final response for each implementation task should contain:

1.  What was changed
2.  Files changed
3.  Database changes
4.  API changes
5.  Frontend changes
6.  Tests/build performed
7.  How to run
8.  Any assumptions

## Important Rule

Do not consider a feature complete merely because the UI exists.

A complete feature should work end-to-end:

React UI -\> API -\> Service -\> Database -\> Response -\> React UI

with validation, authorization, error handling, and appropriate testing.

Start by inspecting the repository and preparing a phased implementation
plan. Do not immediately generate a large amount of code before
understanding the existing project.
