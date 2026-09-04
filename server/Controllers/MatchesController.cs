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
public class MatchesController : ControllerBase
{
    private readonly CricketDbContext _context;
    private readonly IScorecardService _scorecardService;
    private readonly ILiveScoringService _liveScoringService;

    public MatchesController(CricketDbContext context, IScorecardService scorecardService, ILiveScoringService liveScoringService)
    {
        _context = context;
        _scorecardService = scorecardService;
        _liveScoringService = liveScoringService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMatches([FromQuery] int? seriesId, [FromQuery] string? status, [FromQuery] DateTime? date, [FromQuery] string? sortOrder)
    {
        var query = _context.Matches
            .Include(m => m.Series)
            .Include(m => m.Team1)
            .Include(m => m.Team2)
            .Include(m => m.WinningTeam)
            .Include(m => m.MOMPlayer)
            .AsQueryable();

        if (seriesId.HasValue && seriesId.Value > 0)
        {
            query = query.Where(m => m.SeriesId == seriesId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(m => m.Status.ToLower() == status.ToLower().Trim());
        }
        else
        {
            // By default ("All Statuses"), exclude soft-deleted/cancelled matches
            query = query.Where(m => m.Status != "Cancelled");
        }

        if (date.HasValue)
        {
            var targetDate = date.Value.Date;
            query = query.Where(m => m.ScheduledDate.Date == targetDate);
        }

        if (sortOrder?.ToLower() == "desc")
        {
            query = query.OrderByDescending(m => m.ScheduledDate).ThenByDescending(m => m.MatchOrder);
        }
        else
        {
            // Default to ascending order (Match #1, Match #2, Match #3...)
            query = query.OrderBy(m => m.MatchOrder).ThenBy(m => m.ScheduledDate);
        }

        var matches = await query
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
                Result = m.Result,
                ResultType = m.ResultType,
                WinningMargin = m.WinningMargin,
                MOMPlayerId = m.MOMPlayerId,
                MOMPlayerName = m.MOMPlayer != null ? $"{m.MOMPlayer.FirstName} {m.MOMPlayer.LastName}" : null,
                MOMScore = m.MOMScore
            })
            .ToListAsync();

        return Ok(matches);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetMatchById(int id)
    {
        var m = await _context.Matches
            .Include(m => m.Series)
            .Include(m => m.Team1)
            .Include(m => m.Team2)
            .Include(m => m.WinningTeam)
            .Include(m => m.MOMPlayer)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (m == null) return NotFound(new { message = "Match not found." });

        return Ok(new MatchDto
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
            WinningTeamName = m.WinningTeam?.Name,
            Result = m.Result,
            MOMPlayerId = m.MOMPlayerId,
            MOMPlayerName = m.MOMPlayer != null ? $"{m.MOMPlayer.FirstName} {m.MOMPlayer.LastName}" : null
        });
    }

    [Authorize(Roles = "Admin,Umpire")]
    [HttpPost]
    public async Task<IActionResult> CreateMatch([FromBody] CreateMatchRequest req)
    {
        if (req.Team1Id == req.Team2Id)
        {
            return BadRequest(new { message = "Team 1 and Team 2 must be different teams." });
        }

        var series = await _context.Series.FindAsync(req.SeriesId);
        if (series == null) return BadRequest(new { message = "Selected series does not exist." });

        var team1 = await _context.Teams.FindAsync(req.Team1Id);
        var team2 = await _context.Teams.FindAsync(req.Team2Id);
        if (team1 == null || team2 == null)
        {
            return BadRequest(new { message = "Selected teams must exist." });
        }

        var match = new Match
        {
            SeriesId = req.SeriesId,
            Team1Id = req.Team1Id,
            Team2Id = req.Team2Id,
            MatchOrder = req.MatchOrder <= 0 ? 1 : req.MatchOrder,
            RequiredOvers = req.RequiredOvers <= 0 ? 6 : req.RequiredOvers,
            ScheduledDate = req.ScheduledDate.Date,
            ScheduledTime = string.IsNullOrWhiteSpace(req.ScheduledTime) ? "18:00" : req.ScheduledTime.Trim(),
            Address = req.Address?.Trim() ?? string.Empty,
            Status = string.IsNullOrWhiteSpace(req.Status) ? "Scheduled" : req.Status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Matches.AddAsync(match);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetMatchById), new { id = match.Id }, new MatchDto
        {
            Id = match.Id,
            SeriesId = match.SeriesId,
            SeriesName = series.Name,
            Team1Id = match.Team1Id,
            Team1Name = team1.Name,
            Team1ShortName = team1.ShortName,
            Team2Id = match.Team2Id,
            Team2Name = team2.Name,
            Team2ShortName = team2.ShortName,
            MatchOrder = match.MatchOrder,
            RequiredOvers = match.RequiredOvers,
            ScheduledDate = match.ScheduledDate,
            ScheduledTime = match.ScheduledTime,
            Address = match.Address,
            Status = match.Status
        });
    }

    [Authorize(Roles = "Admin,Umpire")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateMatch(int id, [FromBody] UpdateMatchRequest req)
    {
        if (req.Team1Id == req.Team2Id)
        {
            return BadRequest(new { message = "Team 1 and Team 2 must be different teams." });
        }

        var match = await _context.Matches.FindAsync(id);
        if (match == null) return NotFound(new { message = "Match not found." });

        match.SeriesId = req.SeriesId;
        match.Team1Id = req.Team1Id;
        match.Team2Id = req.Team2Id;
        match.MatchOrder = req.MatchOrder;
        match.RequiredOvers = req.RequiredOvers;
        match.ScheduledDate = req.ScheduledDate.Date;
        match.ScheduledTime = req.ScheduledTime;
        match.Address = req.Address;
        match.Status = req.Status;
        match.WinningTeamId = req.WinningTeamId;
        match.Result = req.Result;
        match.MOMPlayerId = req.MOMPlayerId;
        match.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetMatchById(id);
    }

    [Authorize(Roles = "Admin,Umpire")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMatch(int id)
    {
        var match = await _context.Matches.FindAsync(id);
        if (match == null) return NotFound(new { message = "Match not found." });

        if (!string.Equals(match.Status, "Scheduled", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Only matches with 'Scheduled' status can be deleted." });
        }

        // Soft delete / cancel
        match.Status = "Cancelled";
        match.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Match marked as cancelled (soft deleted)." });
    }

    [HttpGet("{id}/scorecard")]
    public async Task<IActionResult> GetScorecard(int id)
    {
        var scorecard = await _scorecardService.GetScorecardAsync(id);
        if (scorecard == null) return NotFound(new { message = "Scorecard not found for this match." });

        return Ok(scorecard);
    }

    [Authorize(Roles = "Admin,Umpire")]
    [HttpPost("{id}/scorecard")]
    [HttpPut("{id}/scorecard")]
    public async Task<IActionResult> SaveScorecard(int id, [FromBody] SaveScorecardRequest req)
    {
        var result = await _scorecardService.SaveScorecardAsync(id, req);
        if (result == null) return NotFound(new { message = "Match not found." });

        return Ok(result);
    }

    // ==========================================
    // LIVE BALL-BY-BALL SCORING ENDPOINTS
    // ==========================================

    [HttpGet("{id}/live-score")]
    public async Task<IActionResult> GetLiveScore(int id)
    {
        var liveScore = await _liveScoringService.GetLiveScoreAsync(id);
        if (liveScore == null) return NotFound(new { message = "Match not found." });

        return Ok(liveScore);
    }

    [Authorize(Roles = "Admin,Umpire")]
    [HttpPost("{id}/innings/start")]
    public async Task<IActionResult> StartInnings(int id, [FromBody] StartInningsRequest req)
    {
        try
        {
            var result = await _liveScoringService.StartInningsAsync(id, req);
            if (result == null) return NotFound(new { message = "Match not found." });
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Umpire")]
    [HttpPost("{id}/innings/{inningsId}/ball")]
    public async Task<IActionResult> RecordBall(int id, int inningsId, [FromBody] RecordBallRequest req)
    {
        try
        {
            var result = await _liveScoringService.RecordBallAsync(id, inningsId, req);
            if (result == null) return NotFound(new { message = "Match or Innings not found." });
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Umpire")]
    [HttpPost("{id}/innings/{inningsId}/wicket")]
    public async Task<IActionResult> RecordWicket(int id, int inningsId, [FromBody] RecordWicketRequest req)
    {
        try
        {
            var result = await _liveScoringService.RecordWicketAsync(id, inningsId, req);
            if (result == null) return NotFound(new { message = "Match or Innings not found." });
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Umpire")]
    [HttpPost("{id}/innings/{inningsId}/new-batsman")]
    public async Task<IActionResult> SelectNewBatsman(int id, int inningsId, [FromBody] SelectNewBatsmanRequest req)
    {
        try
        {
            var result = await _liveScoringService.SelectNewBatsmanAsync(id, inningsId, req);
            if (result == null) return NotFound(new { message = "Match or Innings not found." });
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Umpire")]
    [HttpPost("{id}/innings/{inningsId}/next-over")]
    public async Task<IActionResult> NextOver(int id, int inningsId, [FromBody] NextOverRequest req)
    {
        try
        {
            var result = await _liveScoringService.NextOverAsync(id, inningsId, req);
            if (result == null) return NotFound(new { message = "Match or Innings not found." });
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Umpire")]
    [HttpPost("{id}/innings/{inningsId}/complete")]
    public async Task<IActionResult> CompleteInnings(int id, int inningsId)
    {
        var result = await _liveScoringService.CompleteInningsAsync(id, inningsId);
        if (result == null) return NotFound(new { message = "Match or Innings not found." });
        return Ok(result);
    }

    [Authorize(Roles = "Admin,Umpire")]
    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteMatch(int id, [FromBody] CompleteMatchRequest req)
    {
        var result = await _liveScoringService.CompleteMatchAsync(id, req);
        if (result == null) return NotFound(new { message = "Match not found." });
        return Ok(result);
    }
}
