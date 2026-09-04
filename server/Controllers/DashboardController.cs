using CricketApp.Api.Data;
using CricketApp.Api.DTOs;
using CricketApp.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly CricketDbContext _context;

    public DashboardController(CricketDbContext context)
    {
        _context = context;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var today = DateTime.UtcNow.Date;

        var totalPlayers = await _context.Players.CountAsync(p => p.Status == "Active");
        var totalTeams = await _context.Teams.CountAsync(t => t.Status == "Active");
        var totalSeries = await _context.Series.CountAsync();
        var totalMatches = await _context.Matches.CountAsync();
        var completedMatches = await _context.Matches.CountAsync(m => m.Status == "Completed");
        var scheduledMatches = await _context.Matches.CountAsync(m => m.Status == "Scheduled");
        var todayMatches = await _context.Matches.CountAsync(m => m.ScheduledDate.Date == today);

        var recentMatches = await _context.Matches
            .Include(m => m.Series)
            .Include(m => m.Team1)
            .Include(m => m.Team2)
            .Include(m => m.WinningTeam)
            .OrderByDescending(m => m.ScheduledDate)
            .Take(5)
            .Select(m => new MatchDto
            {
                Id = m.Id,
                SeriesId = m.SeriesId,
                SeriesName = m.Series.Name,
                Team1Id = m.Team1Id,
                Team1Name = m.Team1.Name,
                Team1ShortName = m.Team1.ShortName,
                Team2Id = m.Team2Id,
                Team2Name = m.Team2.Name,
                Team2ShortName = m.Team2.ShortName,
                MatchOrder = m.MatchOrder,
                RequiredOvers = m.RequiredOvers,
                ScheduledDate = m.ScheduledDate,
                ScheduledTime = m.ScheduledTime,
                Address = m.Address,
                Status = m.Status,
                WinningTeamId = m.WinningTeamId,
                WinningTeamName = m.WinningTeam != null ? m.WinningTeam.Name : null,
                Result = m.Result
            })
            .ToListAsync();

        // Top Run Scorers
        var topRunScorers = await _context.MatchBattingPerformances
            .Include(b => b.Player)
                .ThenInclude(p => p.TeamPlayers.Where(tp => tp.Status == "Active"))
                    .ThenInclude(tp => tp.Team)
            .GroupBy(b => new { b.PlayerId, b.Player.FirstName, b.Player.LastName })
            .Select(g => new TopPerformerDto
            {
                PlayerId = g.Key.PlayerId,
                PlayerName = $"{g.Key.FirstName} {g.Key.LastName}",
                TeamName = g.First().Player.TeamPlayers.Select(tp => tp.Team.Name).FirstOrDefault() ?? "Unassigned",
                TotalRuns = g.Sum(x => x.Runs),
                Innings = g.Count(),
                StrikeRate = CricketCalculationHelper.CalculateStrikeRate(g.Sum(x => x.Runs), g.Sum(x => x.BallsFaced))
            })
            .OrderByDescending(p => p.TotalRuns)
            .Take(5)
            .ToListAsync();

        // Top Wicket Takers
        var topWicketTakers = await _context.MatchBowlingPerformances
            .Include(b => b.Player)
                .ThenInclude(p => p.TeamPlayers.Where(tp => tp.Status == "Active"))
                    .ThenInclude(tp => tp.Team)
            .GroupBy(b => new { b.PlayerId, b.Player.FirstName, b.Player.LastName })
            .Select(g => new TopBowlerDto
            {
                PlayerId = g.Key.PlayerId,
                PlayerName = $"{g.Key.FirstName} {g.Key.LastName}",
                TeamName = g.First().Player.TeamPlayers.Select(tp => tp.Team.Name).FirstOrDefault() ?? "Unassigned",
                TotalWickets = g.Sum(x => x.Wickets),
                Innings = g.Count(),
                EconomyRate = CricketCalculationHelper.CalculateEconomyRate(g.Sum(x => x.RunsConceded), g.Sum(x => x.BallsBowled))
            })
            .OrderByDescending(p => p.TotalWickets)
            .Take(5)
            .ToListAsync();

        return Ok(new DashboardStatsDto
        {
            TotalPlayers = totalPlayers,
            TotalTeams = totalTeams,
            TotalSeries = totalSeries,
            TotalMatches = totalMatches,
            CompletedMatches = completedMatches,
            ScheduledMatches = scheduledMatches,
            TodayMatches = todayMatches,
            RecentMatches = recentMatches,
            TopRunScorers = topRunScorers,
            TopWicketTakers = topWicketTakers
        });
    }
}
