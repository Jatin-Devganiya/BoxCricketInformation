# Project Context --- Cricket Statistics Web Application

## Product Name

Cricket Statistics Management System

## Application Type

Responsive web application.

## Technology

Frontend: React.js

Backend: ASP.NET Core Web API

Database: Microsoft SQL Server

Authentication: JWT + role-based authorization

ORM: Entity Framework Core

## Main Business Objects

1.  Application User
2.  Role
3.  Player
4.  Team
5.  Series
6.  Match
7.  Match Innings
8.  Batting Performance
9.  Bowling Performance

## Relationship

User -\> Role

Team -\> TeamPlayers -\> Player

Series -\> Matches

Match -\> Series -\> Team 1 -\> Team 2 -\> Innings -\> Batting
Performances -\> Bowling Performances

Player -\> Batting Performances -\> Bowling Performances

## Roles

Admin: Can manage users, players, teams, series and matches.

User: Can manage series and matches.

Viewer: Can view information and statistics.

## Player Categories

-   Batsman
-   Bowler

Future:

-   AllRounder
-   WicketKeeper

## Series

A series groups matches by a defined date/period.

A single-day series can have:

StartDate = EndDate

The system must preserve historical series and matches.

## Match

A match always has:

-   One series
-   Two different teams
-   Match order
-   Date
-   Time
-   Address/venue
-   Status
-   Scorecard

## Match Status

-   Scheduled
-   InProgress
-   Completed
-   Abandoned
-   Cancelled

## Player Batting Metrics

-   Matches
-   Innings
-   Runs
-   Balls faced
-   Highest score
-   Run rate
-   Fours
-   Sixes
-   Dot balls
-   1-run count
-   2-run count
-   3-run count
-   4-run count
-   5-run count
-   6-run count
-   Six-in-row count
-   Four-boundaries-in-row count
-   Zero-out count
-   Out/dismissal information

## Player Bowling Metrics

-   Matches
-   Innings
-   Balls
-   Overs
-   Wickets
-   Run rate
-   Highest wickets in an innings/match
-   Maiden overs
-   Hat tricks
-   Wides
-   No balls

## Cricket Calculation Rule

Store legal balls where possible.

6 legal balls = 1 over.

For example:

11 balls = 1 over + 5 balls.

Do not calculate cricket overs as normal decimal numbers.

## Security

Never store plain-text passwords.

Never return password hashes to React.

Never log passwords.

Enforce authorization in ASP.NET Core.

## UI

Simple layout:

Header Sidebar Main content Footer

Required pages:

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
-   Scorecard
-   User Management

## Design Goal

Simple. Clean. Responsive. Easy to use. Easy to maintain. No unnecessary
enterprise complexity.

## Version 1 Scope

Implement player/team/series/match management and player-level scorecard
statistics.

Do not implement ball-by-ball scoring initially.
