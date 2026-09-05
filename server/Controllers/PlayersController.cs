using CricketApp.Api.Attributes;
using CricketApp.Api.Data;
using CricketApp.Api.DTOs;
using CricketApp.Api.Models;
using CricketApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PlayersController : ControllerBase
{
    private readonly CricketDbContext _context;
    private readonly IPlayerStatsService _statsService;

    public PlayersController(CricketDbContext context, IPlayerStatsService statsService)
    {
        _context = context;
        _statsService = statsService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPlayers([FromQuery] string? search, [FromQuery] string? category, [FromQuery] string? status)
    {
        var query = _context.Players
            .Include(p => p.TeamPlayers.Where(tp => tp.Status == "Active"))
                .ThenInclude(tp => tp.Team)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower().Trim();
            query = query.Where(p => p.FirstName.ToLower().Contains(s) || p.LastName.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(p => p.PlayerCategory.ToLower() == category.ToLower().Trim());
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(p => p.Status.ToLower() == status.ToLower().Trim());
        }

        // Aggregate all-time runs per player across all matches
        var runsMap = await _context.MatchBattingPerformances
            .GroupBy(b => b.PlayerId)
            .Select(g => new { PlayerId = g.Key, TotalRuns = g.Sum(x => x.Runs) })
            .ToDictionaryAsync(x => x.PlayerId, x => x.TotalRuns);

        // Aggregate all-time wickets per player across all matches
        var wicketsMap = await _context.MatchBowlingPerformances
            .GroupBy(b => b.PlayerId)
            .Select(g => new { PlayerId = g.Key, TotalWickets = g.Sum(x => x.Wickets) })
            .ToDictionaryAsync(x => x.PlayerId, x => x.TotalWickets);

        // Compute global batting ranks across all players with runs > 0 (dense ranking)
        var battingRanks = new Dictionary<int, int>();
        int currentBatRank = 0;
        int prevRuns = -1;
        foreach (var item in runsMap.Where(kv => kv.Value > 0).OrderByDescending(kv => kv.Value))
        {
            if (item.Value != prevRuns)
            {
                currentBatRank++;
                prevRuns = item.Value;
            }
            battingRanks[item.Key] = currentBatRank;
        }

        // Compute global bowling ranks across all players with wickets > 0 (dense ranking)
        var bowlingRanks = new Dictionary<int, int>();
        int currentBowlRank = 0;
        int prevWickets = -1;
        foreach (var item in wicketsMap.Where(kv => kv.Value > 0).OrderByDescending(kv => kv.Value))
        {
            if (item.Value != prevWickets)
            {
                currentBowlRank++;
                prevWickets = item.Value;
            }
            bowlingRanks[item.Key] = currentBowlRank;
        }

        var players = await query
            .OrderBy(p => p.FirstName)
            .ThenBy(p => p.LastName)
            .Select(p => new PlayerDto
            {
                Id = p.Id,
                FirstName = p.FirstName,
                LastName = p.LastName,
                PlayerCategory = p.PlayerCategory,
                Status = p.Status,
                UserId = p.UserId,
                CurrentTeamName = p.TeamPlayers.Select(tp => tp.Team.Name).FirstOrDefault(),
                ManOfTheMatchCount = _context.Matches.Count(m => m.MOMPlayerId == p.Id),
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        foreach (var p in players)
        {
            p.TotalRuns = runsMap.GetValueOrDefault(p.Id, 0);
            p.TotalWickets = wicketsMap.GetValueOrDefault(p.Id, 0);
            p.BattingRank = battingRanks.TryGetValue(p.Id, out var batRank) ? batRank : null;
            p.BowlingRank = bowlingRanks.TryGetValue(p.Id, out var bowlRank) ? bowlRank : null;
        }

        return Ok(players);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPlayerById(int id)
    {
        var player = await _context.Players
            .Include(p => p.TeamPlayers.Where(tp => tp.Status == "Active"))
                .ThenInclude(tp => tp.Team)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (player == null) return NotFound(new { message = "Player not found." });

        var momCount = await _context.Matches.CountAsync(m => m.MOMPlayerId == player.Id);

        var playerRuns = await _context.MatchBattingPerformances
            .Where(b => b.PlayerId == id)
            .SumAsync(b => (int?)b.Runs) ?? 0;

        var playerWickets = await _context.MatchBowlingPerformances
            .Where(b => b.PlayerId == id)
            .SumAsync(b => (int?)b.Wickets) ?? 0;

        int? batRank = null;
        if (playerRuns > 0)
        {
            var higherRuns = await _context.MatchBattingPerformances
                .GroupBy(b => b.PlayerId)
                .Where(g => g.Sum(x => x.Runs) > playerRuns)
                .CountAsync();
            batRank = higherRuns + 1;
        }

        int? bowlRank = null;
        if (playerWickets > 0)
        {
            var higherWickets = await _context.MatchBowlingPerformances
                .GroupBy(b => b.PlayerId)
                .Where(g => g.Sum(x => x.Wickets) > playerWickets)
                .CountAsync();
            bowlRank = higherWickets + 1;
        }

        return Ok(new PlayerDto
        {
            Id = player.Id,
            FirstName = player.FirstName,
            LastName = player.LastName,
            PlayerCategory = player.PlayerCategory,
            Status = player.Status,
            UserId = player.UserId,
            CurrentTeamName = player.TeamPlayers.Select(tp => tp.Team.Name).FirstOrDefault(),
            ManOfTheMatchCount = momCount,
            TotalRuns = playerRuns,
            TotalWickets = playerWickets,
            BattingRank = batRank,
            BowlingRank = bowlRank,
            CreatedAt = player.CreatedAt
        });
    }

    [HttpGet("{id}/statistics")]
    public async Task<IActionResult> GetPlayerStatistics(int id)
    {
        var stats = await _statsService.GetPlayerStatisticsAsync(id);
        if (stats == null) return NotFound(new { message = "Player not found." });

        return Ok(stats);
    }

    [RequirePermission("Players")]
    [HttpPost]
    public async Task<IActionResult> CreatePlayer([FromBody] CreatePlayerRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.FirstName) || string.IsNullOrWhiteSpace(req.LastName))
        {
            return BadRequest(new { success = false, message = "First name and last name are required." });
        }

        var trimmedFirstName = req.FirstName.Trim();
        var trimmedLastName = req.LastName.Trim();
        var playerStatus = string.IsNullOrWhiteSpace(req.Status) ? "Active" : req.Status.Trim();

        if (playerStatus.Equals("Active", StringComparison.OrdinalIgnoreCase))
        {
            var isDuplicate = await _context.Players.AnyAsync(p =>
                p.Status == "Active" &&
                p.FirstName.ToLower() == trimmedFirstName.ToLower() &&
                p.LastName.ToLower() == trimmedLastName.ToLower());

            if (isDuplicate)
            {
                return BadRequest(new { success = false, message = "Player with the same first name and last name already exists." });
            }
        }

        var player = new Player
        {
            FirstName = trimmedFirstName,
            LastName = trimmedLastName,
            PlayerCategory = req.PlayerCategory,
            Status = playerStatus,
            UserId = req.UserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        try
        {
            await _context.Players.AddAsync(player);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.GetBaseException() is Microsoft.Data.SqlClient.SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            return BadRequest(new { success = false, message = "Player with the same first name and last name already exists." });
        }

        if (req.TeamId.HasValue && req.TeamId.Value > 0)
        {
            await _context.TeamPlayers.AddAsync(new TeamPlayer
            {
                PlayerId = player.Id,
                TeamId = req.TeamId.Value,
                Status = "Active"
            });
            await _context.SaveChangesAsync();
        }

        return CreatedAtAction(nameof(GetPlayerById), new { id = player.Id }, new PlayerDto
        {
            Id = player.Id,
            FirstName = player.FirstName,
            LastName = player.LastName,
            PlayerCategory = player.PlayerCategory,
            Status = player.Status,
            UserId = player.UserId,
            CreatedAt = player.CreatedAt
        });
    }

    [RequirePermission("Players")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePlayer(int id, [FromBody] UpdatePlayerRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.FirstName) || string.IsNullOrWhiteSpace(req.LastName))
        {
            return BadRequest(new { success = false, message = "First name and last name are required." });
        }

        var player = await _context.Players.FindAsync(id);
        if (player == null) return NotFound(new { success = false, message = "Player not found." });

        var trimmedFirstName = req.FirstName.Trim();
        var trimmedLastName = req.LastName.Trim();
        var targetStatus = string.IsNullOrWhiteSpace(req.Status) ? player.Status : req.Status.Trim();

        if (targetStatus.Equals("Active", StringComparison.OrdinalIgnoreCase))
        {
            var isDuplicate = await _context.Players.AnyAsync(p =>
                p.Id != id &&
                p.Status == "Active" &&
                p.FirstName.ToLower() == trimmedFirstName.ToLower() &&
                p.LastName.ToLower() == trimmedLastName.ToLower());

            if (isDuplicate)
            {
                return BadRequest(new { success = false, message = "Player with the same first name and last name already exists." });
            }
        }

        player.FirstName = trimmedFirstName;
        player.LastName = trimmedLastName;
        player.PlayerCategory = req.PlayerCategory;
        player.Status = targetStatus;
        player.UserId = req.UserId;
        player.UpdatedAt = DateTime.UtcNow;

        if (req.TeamId.HasValue)
        {
            var existingMembership = await _context.TeamPlayers.FirstOrDefaultAsync(tp => tp.PlayerId == id && tp.Status == "Active");
            if (existingMembership != null && existingMembership.TeamId != req.TeamId.Value)
            {
                existingMembership.Status = "Inactive";
                existingMembership.LeftDate = DateTime.UtcNow;
            }

            if (req.TeamId.Value > 0 && (existingMembership == null || existingMembership.TeamId != req.TeamId.Value))
            {
                await _context.TeamPlayers.AddAsync(new TeamPlayer
                {
                    PlayerId = player.Id,
                    TeamId = req.TeamId.Value,
                    Status = "Active"
                });
            }
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.GetBaseException() is Microsoft.Data.SqlClient.SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            return BadRequest(new { success = false, message = "Player with the same first name and last name already exists." });
        }

        return Ok(new PlayerDto
        {
            Id = player.Id,
            FirstName = player.FirstName,
            LastName = player.LastName,
            PlayerCategory = player.PlayerCategory,
            Status = player.Status,
            UserId = player.UserId,
            CreatedAt = player.CreatedAt
        });
    }

    [RequirePermission("Players")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePlayer(int id)
    {
        var player = await _context.Players.FindAsync(id);
        if (player == null) return NotFound(new { message = "Player not found." });

        // Soft delete to protect historical performance records
        player.Status = "Inactive";
        player.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Player marked as inactive." });
    }
}
