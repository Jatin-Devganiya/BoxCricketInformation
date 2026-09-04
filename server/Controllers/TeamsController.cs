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

    [HttpGet]
    public async Task<IActionResult> GetTeams()
    {
        var teams = await _context.Teams
            .Include(t => t.TeamPlayers.Where(tp => tp.Status == "Active"))
            .OrderBy(t => t.Name)
            .Select(t => new TeamDto
            {
                Id = t.Id,
                Name = t.Name,
                ShortName = t.ShortName,
                Status = t.Status,
                PlayerCount = t.TeamPlayers.Count
            })
            .ToListAsync();

        return Ok(teams);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTeamById(int id)
    {
        var team = await _context.Teams
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

    [Authorize(Roles = "Admin,Umpire")]
    [HttpPost]
    public async Task<IActionResult> CreateTeam([FromBody] CreateTeamRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name) || string.IsNullOrWhiteSpace(req.ShortName))
        {
            return BadRequest(new { message = "Team name and short name are required." });
        }

        var team = new Team
        {
            Name = req.Name.Trim(),
            ShortName = req.ShortName.Trim().ToUpper(),
            Status = string.IsNullOrWhiteSpace(req.Status) ? "Active" : req.Status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Teams.AddAsync(team);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTeamById), new { id = team.Id }, new TeamDto
        {
            Id = team.Id,
            Name = team.Name,
            ShortName = team.ShortName,
            Status = team.Status,
            PlayerCount = 0
        });
    }

    [Authorize(Roles = "Admin,Umpire")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTeam(int id, [FromBody] UpdateTeamRequest req)
    {
        var team = await _context.Teams.FindAsync(id);
        if (team == null) return NotFound(new { message = "Team not found." });

        team.Name = req.Name.Trim();
        team.ShortName = req.ShortName.Trim().ToUpper();
        team.Status = req.Status;
        team.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new TeamDto
        {
            Id = team.Id,
            Name = team.Name,
            ShortName = team.ShortName,
            Status = team.Status,
            PlayerCount = await _context.TeamPlayers.CountAsync(tp => tp.TeamId == id && tp.Status == "Active")
        });
    }

    [Authorize(Roles = "Admin,Umpire")]
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

    [Authorize(Roles = "Admin,Umpire")]
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

    [Authorize(Roles = "Admin,Umpire")]
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
