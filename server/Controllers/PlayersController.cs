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

    [Authorize(Roles = "Admin,Umpire")]
    [HttpPost]
    public async Task<IActionResult> CreatePlayer([FromBody] CreatePlayerRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.FirstName) || string.IsNullOrWhiteSpace(req.LastName))
        {
            return BadRequest(new { message = "First name and last name are required." });
        }

        var player = new Player
        {
            FirstName = req.FirstName.Trim(),
            LastName = req.LastName.Trim(),
            PlayerCategory = req.PlayerCategory,
            Status = string.IsNullOrWhiteSpace(req.Status) ? "Active" : req.Status,
            UserId = req.UserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Players.AddAsync(player);
        await _context.SaveChangesAsync();

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

    [Authorize(Roles = "Admin,Umpire")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePlayer(int id, [FromBody] UpdatePlayerRequest req)
    {
        var player = await _context.Players.FindAsync(id);
        if (player == null) return NotFound(new { message = "Player not found." });

        player.FirstName = req.FirstName.Trim();
        player.LastName = req.LastName.Trim();
        player.PlayerCategory = req.PlayerCategory;
        player.Status = req.Status;
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

        await _context.SaveChangesAsync();

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

    [Authorize(Roles = "Admin,Umpire")]
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
