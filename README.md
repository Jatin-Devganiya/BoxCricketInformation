# Cricket Information & Statistics Management System

A full-stack, responsive web application for managing box cricket tournaments, teams, players, matches, match scorecards, and player career statistics.

## Architecture

```text
                    WEB BROWSER
                         │
                         ▼
             React.js + TypeScript (Vite)
                     [Port 5173]
                         │
                         ▼ (REST API / HTTPS / Proxy)
              ASP.NET Core 9 Web API
                     [Port 5000]
                         │
                         ▼ (Entity Framework Core 9)
             Microsoft SQL Server 2022
             [Database: CricketStatisticsDb]
```

## Features

- **JWT Authentication & Role-Based Authorization**:
  - `Admin`: Full CRUD control on Users, Players, Teams, Tournaments/Series, Matches, and Scorecards.
  - `User`: Manage Tournaments/Series, Matches, and Scorecards; view Players and Teams.
  - `Viewer / Public`: View-only access to leaderboards, match results, player statistics, and scorecards.
- **Dashboard & KPIs**:
  - Live counts of total players, teams, active tournaments, completed matches, and today's matches.
  - Top Run Scorers and Top Wicket Takers leaderboards with instant strike rate & economy rate calculations.
  - Recent & Upcoming matches with one-click scorecard inspection.
- **Players Directory & Statistics**:
  - Categorization (Batsman, Bowler, All-Rounder, Wicket-Keeper).
  - Career batting metrics: Matches, Innings, Runs, Highest Score, Strike Rate, 4s, 6s, Dot Balls, Ducks (zero-outs), 1s, 2s, 3s, 5s, 6-in-a-row and 4-in-a-row boundary streaks, and dismissals.
  - Career bowling metrics: Legal balls bowled, cricket over notation ($11\text{ balls} = 1.5\text{ overs}$), runs conceded, wickets, economy rate, maiden overs, hat-tricks, wides, and no-balls.
- **Teams & Squad Rosters**:
  - Team creation, short codes, and squad assignment management.
- **Tournaments & Series**:
  - Single-day tournaments ($\text{StartDate} = \text{EndDate}$) and multi-day championship series.
  - Comprehensive schedule and results breakdown per series.
- **Match Management & Interactive Scorecard Editor**:
  - Schedule matches between teams with customizable required overs (e.g. 6 overs for box cricket).
  - Scorecard entry for 1st and 2nd innings with batsman performance rows and bowler performance rows.
  - Automated calculation of cricket over notation ($6\text{ balls} = 1.0\text{ over}$), strike rates, bowling economies, winning team, and Player of the Match awards.
- **User Management (Admin only)**:
  - Administrative control over system accounts, passwords, and role assignment.

---

## Seed Accounts

The application automatically provisions the following demo accounts on startup:

| Role | Username | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin` | `Admin@123` | Full access (Users, Players, Teams, Series, Matches, Scorecards) |
| **Scorer / User** | `user` | `User@123` | Series, Matches, and Scorecard entry |

*(A quick-fill button is provided on the Login screen for testing).*

---

## Getting Started

### Prerequisites

- [.NET 9.0 SDK](https://dotnet.microsoft.com/)
- [Node.js (v20+ or v22)](https://nodejs.org/)
- [Microsoft SQL Server](https://www.microsoft.com/sql-server) running on `localhost` (Windows Authentication / Trusted Connection)

### 1. Database Setup

Ensure your local SQL Server instance is running. The database `CricketStatisticsDb` and sample seed data (players, teams, league series, sample completed matches, and scorecards) are automatically created on first run using EF Core `EnsureCreatedAsync`.

Connection string in `server/appsettings.json`:
```json
"ConnectionStrings": {
  "DefaultConnection": "Server=localhost;Database=CricketStatisticsDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true;"
}
```

### 2. Run the Backend API

```powershell
cd server
dotnet run --launch-profile http
```
The API will start listening on `http://localhost:5000`. Swagger documentation is available at `http://localhost:5000/swagger`.

### 3. Run the React Frontend

```powershell
cd client
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.
