using CricketApp.Api.Attributes;
using CricketApp.Api.Data;
using CricketApp.Api.DTOs;
using CricketApp.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TeamsController : ControllerBase
{
    private readonly CricketDbContext _context;

    public TeamsController(CricketDbContext context)
    {
        _context = context;
    }

    private int? GetCurrentUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(claim, out var id) ? id : null;
    }

    [HttpGet]
    public async Task<IActionResult> GetTeams()
    {
        var teams = await _context.Teams
            .Include(t => t.TeamPlayers.Where(tp => tp.Status == "Active"))
            .Include(t => t.CreatedByUser)
            .OrderBy(t => t.Name)
            .Select(t => new TeamDto
            {
                Id = t.Id,
                Name = t.Name,
                ShortName = t.ShortName,
                Status = t.Status,
                PlayerCount = t.TeamPlayers.Count,
                CreatedByUserId = t.CreatedByUserId,
                CreatedByUsername = t.CreatedByUser != null ? t.CreatedByUser.Username : null
            })
            .ToListAsync();

        return Ok(teams);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTeamById(int id)
    {
        var team = await _context.Teams
            .Include(t => t.CreatedByUser)
            .Include(t => t.TeamPlayers.Where(tp => tp.Status == "Active"))
                .ThenInclude(tp => tp.Player)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (team == null) return NotFound(new { message = "Team not found." });

        return Ok(new TeamDetailDto
        {
            Id = team.Id,
            Name = team.Name,
            ShortName = team.ShortName,
            Status = team.Status,
            CreatedByUserId = team.CreatedByUserId,
            CreatedByUsername = team.CreatedByUser?.Username,
            Players = team.TeamPlayers.Select(tp => new PlayerDto
            {
                Id = tp.Player.Id,
                FirstName = tp.Player.FirstName,
                LastName = tp.Player.LastName,
                PlayerCategory = tp.Player.PlayerCategory,
                Status = tp.Player.Status,
                CurrentTeamName = team.Name,
                CreatedAt = tp.Player.CreatedAt
            }).ToList()
        });
    }

    [RequirePermission("Teams")]
    [HttpPost]
    public async Task<IActionResult> CreateTeam([FromBody] CreateTeamRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.ShortName))
        {
            return BadRequest(new { success = false, message = "Team name and short name are required." });
        }

        var trimmedName = req.Name.Trim();
        var teamStatus = string.IsNullOrWhiteSpace(req.Status) ? "Active" : req.Status.Trim();

        if (teamStatus.Equals("Active", StringComparison.OrdinalIgnoreCase))
        {
            var isDuplicate = await _context.Teams.AnyAsync(t =>
                t.Status == "Active" &&
                t.Name.ToLower() == trimmedName.ToLower());

            if (isDuplicate)
            {
                return BadRequest(new { success = false, message = "Team name already exists." });
            }
        }

        var team = new Team
        {
            Name = trimmedName,
            ShortName = req.ShortName.Trim().ToUpper(),
            Status = teamStatus,
            CreatedByUserId = GetCurrentUserId(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        try
        {
            await _context.Teams.AddAsync(team);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.GetBaseException() is Microsoft.Data.SqlClient.SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            return BadRequest(new { success = false, message = "Team name already exists." });
        }

        return CreatedAtAction(nameof(GetTeamById), new { id = team.Id }, new TeamDto
        {
            Id = team.Id,
            Name = team.Name,
            ShortName = team.ShortName,
            Status = team.Status,
            PlayerCount = 0,
            CreatedByUserId = team.CreatedByUserId,
            CreatedByUsername = User.Identity?.Name
        });
    }

    [RequirePermission("Teams")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTeam(int id, [FromBody] UpdateTeamRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.ShortName))
        {
            return BadRequest(new { success = false, message = "Team name and short name are required." });
        }

        var team = await _context.Teams.FindAsync(id);
        if (team == null) return NotFound(new { success = false, message = "Team not found." });

        var trimmedName = req.Name.Trim();
        var targetStatus = string.IsNullOrWhiteSpace(req.Status) ? team.Status : req.Status.Trim();

        if (targetStatus.Equals("Active", StringComparison.OrdinalIgnoreCase))
        {
            var isDuplicate = await _context.Teams.AnyAsync(t =>
                t.Id != id &&
                t.Status == "Active" &&
                t.Name.ToLower() == trimmedName.ToLower());

            if (isDuplicate)
            {
                return BadRequest(new { success = false, message = "Team name already exists." });
            }
        }

        team.Name = trimmedName;
        team.ShortName = req.ShortName.Trim().ToUpper();
        team.Status = targetStatus;
        team.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.GetBaseException() is Microsoft.Data.SqlClient.SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            return BadRequest(new { success = false, message = "Team name already exists." });
        }

        return Ok(new TeamDto
        {
            Id = team.Id,
            Name = team.Name,
            ShortName = team.ShortName,
            Status = team.Status,
            PlayerCount = await _context.TeamPlayers.CountAsync(tp => tp.TeamId == id && tp.Status == "Active"),
            CreatedByUserId = team.CreatedByUserId
        });
    }

    [RequirePermission("Teams")]
    [HttpPost("{id}/players")]
    public async Task<IActionResult> AddPlayerToTeam(int id, [FromBody] AssignPlayerToTeamRequest req)
    {
        var team = await _context.Teams.FindAsync(id);
        if (team == null) return NotFound(new { message = "Team not found." });

        var player = await _context.Players.FindAsync(req.PlayerId);
        if (player == null) return NotFound(new { message = "Player not found." });

        var existing = await _context.TeamPlayers.FirstOrDefaultAsync(tp => tp.TeamId == id && tp.PlayerId == req.PlayerId);
        if (existing != null)
        {
            existing.Status = "Active";
            existing.LeftDate = null;
        }
        else
        {
            await _context.TeamPlayers.AddAsync(new TeamPlayer
            {
                TeamId = id,
                PlayerId = req.PlayerId,
                JoinedDate = DateTime.UtcNow,
                Status = "Active"
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = $"Player {player.FirstName} {player.LastName} added to {team.Name}." });
    }

    [RequirePermission("Teams")]
    [HttpDelete("{id}/players/{playerId}")]
    public async Task<IActionResult> RemovePlayerFromTeam(int id, int playerId)
    {
        var membership = await _context.TeamPlayers.FirstOrDefaultAsync(tp => tp.TeamId == id && tp.PlayerId == playerId && tp.Status == "Active");
        if (membership == null) return NotFound(new { message = "Player membership not found." });

        membership.Status = "Inactive";
        membership.LeftDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Player removed from team." });
    }

    [RequirePermission("Teams")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTeam(int id)
    {
        var team = await _context.Teams.FindAsync(id);
        if (team == null) return NotFound(new { message = "Team not found." });

        // Soft delete to protect matches and scorecards
        team.Status = "Inactive";
        team.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Team marked as inactive." });
    }
}
