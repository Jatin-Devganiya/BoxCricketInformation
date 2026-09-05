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
public class MatchesController : ControllerBase
{
    private readonly CricketDbContext _context;
    private readonly IScorecardService _scorecardService;
    private readonly ILiveScoringService _liveScoringService;
    private readonly IStatusValidationService _statusValidationService;

    public MatchesController(
        CricketDbContext context,
        IScorecardService scorecardService,
        ILiveScoringService liveScoringService,
        IStatusValidationService statusValidationService)
    {
        _context = context;
        _scorecardService = scorecardService;
        _liveScoringService = liveScoringService;
        _statusValidationService = statusValidationService;
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

        var matchEntities = await query
            .Select(m => new
            {
                m.Id,
                m.SeriesId,
                SeriesName = m.Series.Name,
                m.Team1Id,
                Team1Name = m.Team1.Name,
                Team1ShortName = m.Team1.ShortName,
                m.Team2Id,
                Team2Name = m.Team2.Name,
                Team2ShortName = m.Team2.ShortName,
                m.MatchOrder,
                m.RequiredOvers,
                m.ScheduledDate,
                m.ScheduledTime,
                m.Address,
                m.Status,
                m.WinningTeamId,
                WinningTeamName = m.WinningTeam != null ? m.WinningTeam.Name : null,
                m.Result,
                m.ResultType,
                m.WinningMargin,
                m.MOMPlayerId,
                MOMPlayerName = m.MOMPlayer != null ? $"{m.MOMPlayer.FirstName} {m.MOMPlayer.LastName}" : null,
                m.MOMScore
            })
            .ToListAsync();

        var matches = matchEntities.Select(m => new MatchDto
        {
            Id = m.Id,
            SeriesId = m.SeriesId,
            SeriesName = m.SeriesName,
            Team1Id = m.Team1Id,
            Team1Name = m.Team1Name,
            Team1ShortName = m.Team1ShortName,
            Team2Id = m.Team2Id,
            Team2Name = m.Team2Name,
            Team2ShortName = m.Team2ShortName,
            MatchOrder = m.MatchOrder,
            RequiredOvers = m.RequiredOvers,
            ScheduledDate = m.ScheduledDate,
            ScheduledTime = m.ScheduledTime,
            Address = m.Address,
            Status = m.Status,
            WinningTeamId = m.WinningTeamId,
            WinningTeamName = m.WinningTeamName,
            Result = FormatMatchResult(m.Result, m.Team1Name, m.Team2Name),
            ResultType = m.ResultType,
            WinningMargin = m.WinningMargin,
            MOMPlayerId = m.MOMPlayerId,
            MOMPlayerName = m.MOMPlayerName,
            MOMScore = m.MOMScore
        }).ToList();

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
            Result = FormatMatchResult(m.Result, m.Team1.Name, m.Team2.Name),
            MOMPlayerId = m.MOMPlayerId,
            MOMPlayerName = m.MOMPlayer != null ? $"{m.MOMPlayer.FirstName} {m.MOMPlayer.LastName}" : null
        });
    }

    private static string FormatMatchResult(string? result, string? team1Name, string? team2Name)
    {
        if (string.IsNullOrWhiteSpace(result)) return string.Empty;
        var formatted = result;
        if (formatted.StartsWith("Team 1 ", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(team1Name))
        {
            formatted = team1Name + formatted.Substring("Team 1".Length);
        }
        else if (formatted.StartsWith("Team 2 ", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(team2Name))
        {
            formatted = team2Name + formatted.Substring("Team 2".Length);
        }
        return formatted;
    }

    [RequirePermission("Matches")]
    [HttpPost]
    public async Task<IActionResult> CreateMatch([FromBody] CreateMatchRequest req)
    {
        if (req.Team1Id == req.Team2Id)
        {
            return BadRequest(new { message = "Team 1 and Team 2 must be different teams." });
        }

        var series = await _context.Series.FindAsync(req.SeriesId);
        if (series == null) return BadRequest(new { message = "Selected series does not exist." });

        var createValidation = _statusValidationService.ValidateMatchCreation(series, req.Status);
        if (!createValidation.IsValid)
        {
            return BadRequest(new { message = createValidation.ErrorMessage });
        }

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
            Status = string.IsNullOrWhiteSpace(req.Status) ? "Scheduled" : req.Status.Trim(),
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

    [RequirePermission("Matches")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateMatch(int id, [FromBody] UpdateMatchRequest req)
    {
        if (req.Team1Id == req.Team2Id)
        {
            return BadRequest(new { message = "Team 1 and Team 2 must be different teams." });
        }

        var match = await _context.Matches
            .Include(m => m.Innings)
                .ThenInclude(i => i.BattingPerformances)
            .Include(m => m.Innings)
                .ThenInclude(i => i.BowlingPerformances)
            .Include(m => m.Innings)
                .ThenInclude(i => i.BallEvents)
            .FirstOrDefaultAsync(m => m.Id == id);
        if (match == null) return NotFound(new { message = "Match not found." });

        var targetSeries = await _context.Series.FindAsync(req.SeriesId);
        if (targetSeries == null) return BadRequest(new { message = "Selected series does not exist." });

        var updateValidation = _statusValidationService.ValidateMatchStatusTransition(match, targetSeries, req.Status);
        if (!updateValidation.IsValid)
        {
            return BadRequest(new { message = updateValidation.ErrorMessage });
        }

        match.SeriesId = req.SeriesId;
        match.Team1Id = req.Team1Id;
        match.Team2Id = req.Team2Id;
        match.MatchOrder = req.MatchOrder;
        match.RequiredOvers = req.RequiredOvers;
        match.ScheduledDate = req.ScheduledDate.Date;
        match.ScheduledTime = req.ScheduledTime;
        match.Address = req.Address;
        match.Status = req.Status.Trim();
        match.WinningTeamId = req.WinningTeamId;
        match.Result = req.Result;
        match.MOMPlayerId = req.MOMPlayerId;
        match.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetMatchById(id);
    }

    [RequirePermission("Matches")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteMatch(int id)
    {
        var match = await _context.Matches.Include(m => m.Series).FirstOrDefaultAsync(m => m.Id == id);
        if (match == null) return NotFound(new { message = "Match not found." });

        var cancelValidation = _statusValidationService.ValidateMatchCancellation(match, match.Series);
        if (!cancelValidation.IsValid)
        {
            return BadRequest(new { message = cancelValidation.ErrorMessage });
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

    [RequirePermission("LiveScoring")]
    [HttpPost("{id}/scorecard")]
    [HttpPut("{id}/scorecard")]
    public async Task<IActionResult> SaveScorecard(int id, [FromBody] SaveScorecardRequest req)
    {
        var match = await _context.Matches
            .Include(m => m.Series)
            .Include(m => m.Innings)
                .ThenInclude(i => i.BattingPerformances)
            .Include(m => m.Innings)
                .ThenInclude(i => i.BowlingPerformances)
            .Include(m => m.Innings)
                .ThenInclude(i => i.BallEvents)
            .FirstOrDefaultAsync(m => m.Id == id);
        if (match == null) return NotFound(new { message = "Match not found." });

        if (!string.IsNullOrWhiteSpace(req.Status))
        {
            var statusValidation = _statusValidationService.ValidateMatchStatusTransition(match, match.Series, req.Status);
            if (!statusValidation.IsValid)
            {
                return BadRequest(new { message = statusValidation.ErrorMessage });
            }
        }

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

    [RequirePermission("LiveScoring")]
    [HttpPost("{id}/innings/start")]
    public async Task<IActionResult> StartInnings(int id, [FromBody] StartInningsRequest req)
    {
        var match = await _context.Matches.Include(m => m.Series).FirstOrDefaultAsync(m => m.Id == id);
        if (match == null) return NotFound(new { message = "Match not found." });

        var transitionValidation = _statusValidationService.ValidateMatchStatusTransition(match, match.Series, "InProgress");
        if (!transitionValidation.IsValid)
        {
            return BadRequest(new { message = transitionValidation.ErrorMessage });
        }

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

    [RequirePermission("LiveScoring")]
    [HttpPost("{id}/innings/{inningsId}/ball")]
    public async Task<IActionResult> RecordBall(int id, int inningsId, [FromBody] RecordBallRequest req)
    {
        var match = await _context.Matches.Include(m => m.Series).FirstOrDefaultAsync(m => m.Id == id);
        if (match == null) return NotFound(new { message = "Match not found." });

        var scoringValidation = _statusValidationService.ValidateLiveScoringAllowed(match, match.Series);
        if (!scoringValidation.IsValid)
        {
            return BadRequest(new { message = scoringValidation.ErrorMessage });
        }

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

    [RequirePermission("LiveScoring")]
    [HttpPost("{id}/innings/{inningsId}/wicket")]
    public async Task<IActionResult> RecordWicket(int id, int inningsId, [FromBody] RecordWicketRequest req)
    {
        var match = await _context.Matches.Include(m => m.Series).FirstOrDefaultAsync(m => m.Id == id);
        if (match == null) return NotFound(new { message = "Match not found." });

        var scoringValidation = _statusValidationService.ValidateLiveScoringAllowed(match, match.Series);
        if (!scoringValidation.IsValid)
        {
            return BadRequest(new { message = scoringValidation.ErrorMessage });
        }

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

    [RequirePermission("LiveScoring")]
    [HttpPost("{id}/innings/{inningsId}/new-batsman")]
    public async Task<IActionResult> SelectNewBatsman(int id, int inningsId, [FromBody] SelectNewBatsmanRequest req)
    {
        var match = await _context.Matches.Include(m => m.Series).FirstOrDefaultAsync(m => m.Id == id);
        if (match == null) return NotFound(new { message = "Match not found." });

        var scoringValidation = _statusValidationService.ValidateLiveScoringAllowed(match, match.Series);
        if (!scoringValidation.IsValid)
        {
            return BadRequest(new { message = scoringValidation.ErrorMessage });
        }

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

    [RequirePermission("LiveScoring")]
    [HttpPost("{id}/innings/{inningsId}/next-over")]
    public async Task<IActionResult> NextOver(int id, int inningsId, [FromBody] NextOverRequest req)
    {
        var match = await _context.Matches.Include(m => m.Series).FirstOrDefaultAsync(m => m.Id == id);
        if (match == null) return NotFound(new { message = "Match not found." });

        var scoringValidation = _statusValidationService.ValidateLiveScoringAllowed(match, match.Series);
        if (!scoringValidation.IsValid)
        {
            return BadRequest(new { message = scoringValidation.ErrorMessage });
        }

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

    [RequirePermission("LiveScoring")]
    [HttpPost("{id}/innings/{inningsId}/complete")]
    public async Task<IActionResult> CompleteInnings(int id, int inningsId)
    {
        var match = await _context.Matches.Include(m => m.Series).FirstOrDefaultAsync(m => m.Id == id);
        if (match == null) return NotFound(new { message = "Match not found." });

        var scoringValidation = _statusValidationService.ValidateLiveScoringAllowed(match, match.Series);
        if (!scoringValidation.IsValid)
        {
            return BadRequest(new { message = scoringValidation.ErrorMessage });
        }

        var result = await _liveScoringService.CompleteInningsAsync(id, inningsId);
        if (result == null) return NotFound(new { message = "Match or Innings not found." });
        return Ok(result);
    }

    [RequirePermission("LiveScoring")]
    [HttpPost("{id}/complete")]
    public async Task<IActionResult> CompleteMatch(int id, [FromBody] CompleteMatchRequest req)
    {
        var match = await _context.Matches
            .Include(m => m.Series)
            .Include(m => m.Innings)
                .ThenInclude(i => i.BattingPerformances)
            .Include(m => m.Innings)
                .ThenInclude(i => i.BowlingPerformances)
            .Include(m => m.Innings)
                .ThenInclude(i => i.BallEvents)
            .FirstOrDefaultAsync(m => m.Id == id);
        if (match == null) return NotFound(new { message = "Match not found." });

        var completeValidation = _statusValidationService.ValidateMatchStatusTransition(match, match.Series, "Completed");
        if (!completeValidation.IsValid)
        {
            return BadRequest(new { message = completeValidation.ErrorMessage });
        }

        var result = await _liveScoringService.CompleteMatchAsync(id, req);
        if (result == null) return NotFound(new { message = "Match not found." });
        return Ok(result);
    }

    [RequirePermission("LiveScoring")]
    [HttpGet("{id}/innings/{inningsId}/eligible-bowlers")]
    public async Task<IActionResult> GetEligibleBowlers(int id, int inningsId)
    {
        var result = await _liveScoringService.GetEligibleBowlersAsync(id, inningsId);
        if (result == null) return NotFound(new { message = "Match or Innings not found." });
        return Ok(result);
    }

    [RequirePermission("LiveScoring")]
    [HttpPost("{id}/innings/{inningsId}/change-bowler")]
    public async Task<IActionResult> ChangeSelectedBowler(int id, int inningsId, [FromBody] ChangeBowlerRequest req)
    {
        var match = await _context.Matches.Include(m => m.Series).FirstOrDefaultAsync(m => m.Id == id);
        if (match == null) return NotFound(new { message = "Match not found." });

        var scoringValidation = _statusValidationService.ValidateLiveScoringAllowed(match, match.Series);
        if (!scoringValidation.IsValid)
        {
            return BadRequest(new { message = scoringValidation.ErrorMessage });
        }

        try
        {
            var result = await _liveScoringService.ChangeSelectedBowlerAsync(id, inningsId, req);
            if (result == null) return NotFound(new { message = "Match or Innings not found." });
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [RequirePermission("LiveScoring")]
    [HttpPost("{id}/innings/{inningsId}/replace-bowler-in-over")]
    public async Task<IActionResult> ReplaceBowlerForRemainingOver(int id, int inningsId, [FromBody] ReplaceBowlerRequest req)
    {
        var match = await _context.Matches.Include(m => m.Series).FirstOrDefaultAsync(m => m.Id == id);
        if (match == null) return NotFound(new { message = "Match not found." });

        var scoringValidation = _statusValidationService.ValidateLiveScoringAllowed(match, match.Series);
        if (!scoringValidation.IsValid)
        {
            return BadRequest(new { message = scoringValidation.ErrorMessage });
        }

        try
        {
            var result = await _liveScoringService.ReplaceBowlerForRemainingOverAsync(id, inningsId, req);
            if (result == null) return NotFound(new { message = "Match or Innings not found." });
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
