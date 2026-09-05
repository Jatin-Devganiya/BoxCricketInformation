using CricketApp.Api.Attributes;
using CricketApp.Api.Data;
using CricketApp.Api.DTOs;
using CricketApp.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using CricketApp.Api.Services;

namespace CricketApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SeriesController : ControllerBase
{
    private readonly CricketDbContext _context;
    private readonly IStatusValidationService _statusValidationService;

    public SeriesController(CricketDbContext context, IStatusValidationService statusValidationService)
    {
        _context = context;
        _statusValidationService = statusValidationService;
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
                TotalMatches = s.Matches.Count(m => m.Status != "Cancelled"),
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

    [RequirePermission("Series")]
    [HttpPost]
    public async Task<IActionResult> CreateSeries([FromBody] CreateSeriesRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
        {
            return BadRequest(new { success = false, message = "Series name is required." });
        }

        var trimmedName = req.Name.Trim();
        var targetStatus = string.IsNullOrWhiteSpace(req.Status) ? "Scheduled" : req.Status.Trim();

        if (!targetStatus.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            var isDuplicate = await _context.Series.AnyAsync(s =>
                s.Status != "Cancelled" &&
                s.Name.ToLower() == trimmedName.ToLower());

            if (isDuplicate)
            {
                return BadRequest(new { success = false, message = "Series name already exists." });
            }
        }

        var statusValidation = _statusValidationService.ValidateSeriesCreation(req.Status);
        if (!statusValidation.IsValid)
        {
            return BadRequest(new { success = false, message = statusValidation.ErrorMessage });
        }

        var series = new Series
        {
            Name = trimmedName,
            StartDate = req.StartDate.Date,
            EndDate = req.EndDate.Date,
            Status = targetStatus,
            Description = req.Description,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        try
        {
            await _context.Series.AddAsync(series);
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.GetBaseException() is Microsoft.Data.SqlClient.SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            return BadRequest(new { success = false, message = "Series name already exists." });
        }

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

    [RequirePermission("Series")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateSeries(int id, [FromBody] UpdateSeriesRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
        {
            return BadRequest(new { success = false, message = "Series name is required." });
        }

        var series = await _context.Series.FindAsync(id);
        if (series == null) return NotFound(new { success = false, message = "Series not found." });

        var trimmedName = req.Name.Trim();
        var targetStatus = string.IsNullOrWhiteSpace(req.Status) ? series.Status : req.Status.Trim();

        if (!targetStatus.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            var isDuplicate = await _context.Series.AnyAsync(s =>
                s.Id != id &&
                s.Status != "Cancelled" &&
                s.Name.ToLower() == trimmedName.ToLower());

            if (isDuplicate)
            {
                return BadRequest(new { success = false, message = "Series name already exists." });
            }
        }

        var seriesMatches = await _context.Matches.Where(m => m.SeriesId == id).ToListAsync();
        var transitionValidation = _statusValidationService.ValidateSeriesStatusTransition(series.Status, req.Status, seriesMatches);
        if (!transitionValidation.IsValid)
        {
            return BadRequest(new { success = false, message = transitionValidation.ErrorMessage });
        }

        series.Name = trimmedName;
        series.StartDate = req.StartDate.Date;
        series.EndDate = req.EndDate.Date;
        series.Status = targetStatus;
        series.Description = req.Description;
        series.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.GetBaseException() is Microsoft.Data.SqlClient.SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            return BadRequest(new { success = false, message = "Series name already exists." });
        }

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

    [RequirePermission("Series")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteSeries(int id)
    {
        var series = await _context.Series.FindAsync(id);
        if (series == null) return NotFound(new { message = "Series not found." });

        var seriesMatches = await _context.Matches.Where(m => m.SeriesId == id).ToListAsync();
        var cancellationValidation = _statusValidationService.ValidateSeriesCancellation(series.Status, seriesMatches);
        if (!cancellationValidation.IsValid)
        {
            return BadRequest(new { message = cancellationValidation.ErrorMessage });
        }

        // Soft delete / cancel
        series.Status = "Cancelled";
        series.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Series marked as cancelled." });
    }
}
