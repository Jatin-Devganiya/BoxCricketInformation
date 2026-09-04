using CricketApp.Api.Data;
using CricketApp.Api.DTOs;
using CricketApp.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CricketApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SeriesController : ControllerBase
{
    private readonly CricketDbContext _context;

    public SeriesController(CricketDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetSeriesList([FromQuery] string? status)
    {
        var query = _context.Series
            .Include(s => s.Matches)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(s => s.Status.ToLower() == status.ToLower().Trim());
        }

        var list = await query
            .OrderByDescending(s => s.StartDate)
            .Select(s => new SeriesDto
            {
                Id = s.Id,
                Name = s.Name,
                StartDate = s.StartDate,
                EndDate = s.EndDate,
                Status = s.Status,
                Description = s.Description,
                TotalMatches = s.Matches.Count,
                CompletedMatches = s.Matches.Count(m => m.Status == "Completed")
            })
            .ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetSeriesById(int id)
    {
        var series = await _context.Series
            .Include(s => s.Matches)
                .ThenInclude(m => m.Team1)
            .Include(s => s.Matches)
                .ThenInclude(m => m.Team2)
            .Include(s => s.Matches)
                .ThenInclude(m => m.WinningTeam)
            .Include(s => s.Matches)
                .ThenInclude(m => m.MOMPlayer)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (series == null) return NotFound(new { message = "Series not found." });

        return Ok(new SeriesDetailDto
        {
            Id = series.Id,
            Name = series.Name,
            StartDate = series.StartDate,
            EndDate = series.EndDate,
            Status = series.Status,
            Description = series.Description,
            Matches = series.Matches
                .OrderBy(m => m.MatchOrder)
                .ThenBy(m => m.ScheduledDate)
                .Select(m => new MatchDto
                {
                    Id = m.Id,
                    SeriesId = m.SeriesId,
                    SeriesName = series.Name,
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
                    WinningTeamName = m.WinningTeam?.Name,
                    Result = m.Result,
                    MOMPlayerId = m.MOMPlayerId,
                    MOMPlayerName = m.MOMPlayer != null ? $"{m.MOMPlayer.FirstName} {m.MOMPlayer.LastName}" : null
                }).ToList()
        });
    }

    [Authorize(Roles = "Admin,User")]
    [HttpPost]
    public async Task<IActionResult> CreateSeries([FromBody] CreateSeriesRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
        {
            return BadRequest(new { message = "Series name is required." });
        }

        var series = new Series
        {
            Name = req.Name.Trim(),
            StartDate = req.StartDate.Date,
            EndDate = req.EndDate.Date,
            Status = string.IsNullOrWhiteSpace(req.Status) ? "Scheduled" : req.Status,
            Description = req.Description,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Series.AddAsync(series);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSeriesById), new { id = series.Id }, new SeriesDto
        {
            Id = series.Id,
            Name = series.Name,
            StartDate = series.StartDate,
            EndDate = series.EndDate,
            Status = series.Status,
            Description = series.Description,
            TotalMatches = 0,
            CompletedMatches = 0
        });
    }

    [Authorize(Roles = "Admin,User")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSeries(int id, [FromBody] UpdateSeriesRequest req)
    {
        var series = await _context.Series.FindAsync(id);
        if (series == null) return NotFound(new { message = "Series not found." });

        series.Name = req.Name.Trim();
        series.StartDate = req.StartDate.Date;
        series.EndDate = req.EndDate.Date;
        series.Status = req.Status;
        series.Description = req.Description;
        series.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new SeriesDto
        {
            Id = series.Id,
            Name = series.Name,
            StartDate = series.StartDate,
            EndDate = series.EndDate,
            Status = series.Status,
            Description = series.Description,
            TotalMatches = await _context.Matches.CountAsync(m => m.SeriesId == id),
            CompletedMatches = await _context.Matches.CountAsync(m => m.SeriesId == id && m.Status == "Completed")
        });
    }

    [Authorize(Roles = "Admin,User")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSeries(int id)
    {
        var series = await _context.Series.FindAsync(id);
        if (series == null) return NotFound(new { message = "Series not found." });

        // Soft delete / cancel
        series.Status = "Cancelled";
        series.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Series marked as cancelled." });
    }
}
