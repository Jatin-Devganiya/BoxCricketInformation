using CricketApp.Api.Models;

namespace CricketApp.Api.Services;

public class ValidationResult
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }

    public static ValidationResult Success() => new() { IsValid = true };
    public static ValidationResult Fail(string message) => new() { IsValid = false, ErrorMessage = message };
}

public interface IStatusValidationService
{
    ValidationResult ValidateSeriesCreation(string requestedStatus);
    ValidationResult ValidateSeriesStatusTransition(string currentStatus, string targetStatus, IEnumerable<Match> seriesMatches);
    ValidationResult ValidateSeriesCancellation(string currentStatus, IEnumerable<Match> seriesMatches);
    ValidationResult ValidateMatchCreation(Series series, string requestedStatus);
    ValidationResult ValidateMatchStatusTransition(Match match, Series series, string targetStatus);
    ValidationResult ValidateMatchCancellation(Match match, Series series);
    ValidationResult ValidateLiveScoringAllowed(Match match, Series? series);
    ValidationResult ValidateMatchCompletion(Match match);
}

public class StatusValidationService : IStatusValidationService
{
    public const string StatusScheduled = "Scheduled";
    public const string StatusInProgress = "InProgress";
    public const string StatusCompleted = "Completed";
    public const string StatusCancelled = "Cancelled";
    public const string StatusAbandoned = "Abandoned";

    public ValidationResult ValidateSeriesCreation(string requestedStatus)
    {
        var status = (requestedStatus ?? string.Empty).Trim();
        if (string.IsNullOrEmpty(status))
        {
            return ValidationResult.Success(); // Defaults to Scheduled
        }

        if (string.Equals(status, StatusScheduled, StringComparison.OrdinalIgnoreCase))
        {
            return ValidationResult.Success();
        }

        return ValidationResult.Fail($"A new series must be created with '{StatusScheduled}' status.");
    }

    public ValidationResult ValidateSeriesStatusTransition(string currentStatus, string targetStatus, IEnumerable<Match> seriesMatches)
    {
        var current = NormalizeStatus(currentStatus);
        var target = NormalizeStatus(targetStatus);

        if (string.Equals(current, target, StringComparison.OrdinalIgnoreCase))
        {
            return ValidationResult.Success();
        }

        // Rule 15: Series status transition matrix
        switch (current)
        {
            case StatusScheduled:
                if (string.Equals(target, StatusInProgress, StringComparison.OrdinalIgnoreCase))
                {
                    return ValidationResult.Success();
                }
                if (string.Equals(target, StatusCancelled, StringComparison.OrdinalIgnoreCase))
                {
                    return ValidateSeriesCancellation(current, seriesMatches);
                }
                return ValidationResult.Fail($"Invalid series status transition from '{current}' to '{target}'. Allowed transitions: '{StatusInProgress}', '{StatusCancelled}'.");

            case StatusInProgress:
                if (string.Equals(target, StatusCompleted, StringComparison.OrdinalIgnoreCase))
                {
                    // Rule 13: Check that all matches are inactive (Completed, Cancelled, or Abandoned)
                    var activeMatches = seriesMatches.Where(m =>
                        string.Equals(NormalizeStatus(m.Status), StatusScheduled, StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(NormalizeStatus(m.Status), StatusInProgress, StringComparison.OrdinalIgnoreCase)).ToList();

                    if (activeMatches.Count > 0)
                    {
                        return ValidationResult.Fail("Cannot complete the series while there are scheduled or in-progress matches.");
                    }

                    return ValidationResult.Success();
                }
                if (string.Equals(target, StatusCancelled, StringComparison.OrdinalIgnoreCase))
                {
                    return ValidateSeriesCancellation(current, seriesMatches);
                }
                return ValidationResult.Fail($"Invalid series status transition from '{current}' to '{target}'. Allowed transitions: '{StatusCompleted}', '{StatusCancelled}'.");

            case StatusCompleted:
                return ValidationResult.Fail("This series is completed. Series status cannot be changed.");

            case StatusCancelled:
                return ValidationResult.Fail("This series is cancelled. Series status cannot be changed.");

            default:
                return ValidationResult.Fail($"Unknown current series status: '{current}'.");
        }
    }

    public ValidationResult ValidateSeriesCancellation(string currentStatus, IEnumerable<Match> seriesMatches)
    {
        var current = NormalizeStatus(currentStatus);
        if (string.Equals(current, StatusCompleted, StringComparison.OrdinalIgnoreCase))
        {
            return ValidationResult.Fail("This series is completed. Series status cannot be changed.");
        }
        if (string.Equals(current, StatusCancelled, StringComparison.OrdinalIgnoreCase))
        {
            return ValidationResult.Fail("This series is already cancelled.");
        }

        // Rule 14: If an InProgress match exists, do not allow series to be cancelled
        var inProgressMatch = seriesMatches.Any(m => string.Equals(NormalizeStatus(m.Status), StatusInProgress, StringComparison.OrdinalIgnoreCase));
        if (inProgressMatch)
        {
            return ValidationResult.Fail("Cannot cancel the series while a match is in progress.");
        }

        return ValidationResult.Success();
    }

    public ValidationResult ValidateMatchCreation(Series series, string requestedStatus)
    {
        if (series == null)
        {
            return ValidationResult.Fail("Selected series does not exist.");
        }

        var seriesStatus = NormalizeStatus(series.Status);
        var matchStatus = string.IsNullOrWhiteSpace(requestedStatus) ? StatusScheduled : NormalizeStatus(requestedStatus);

        // Rule 3 & 4 & 11: Series Completed or Cancelled
        if (string.Equals(seriesStatus, StatusCompleted, StringComparison.OrdinalIgnoreCase))
        {
            return ValidationResult.Fail("Cannot schedule or add matches to a completed series.");
        }
        if (string.Equals(seriesStatus, StatusCancelled, StringComparison.OrdinalIgnoreCase))
        {
            return ValidationResult.Fail("Cannot schedule or add matches to a cancelled series.");
        }

        // Rule 1 & 11: Series Scheduled
        if (string.Equals(seriesStatus, StatusScheduled, StringComparison.OrdinalIgnoreCase))
        {
            if (!string.Equals(matchStatus, StatusScheduled, StringComparison.OrdinalIgnoreCase))
            {
                return ValidationResult.Fail($"New match under a scheduled series can ONLY have '{StatusScheduled}' status.");
            }
            return ValidationResult.Success();
        }

        // Rule 2 & 11: Series InProgress
        if (string.Equals(seriesStatus, StatusInProgress, StringComparison.OrdinalIgnoreCase))
        {
            if (!string.Equals(matchStatus, StatusScheduled, StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(matchStatus, StatusInProgress, StringComparison.OrdinalIgnoreCase))
            {
                return ValidationResult.Fail($"New match under an in-progress series can only have '{StatusScheduled}' or '{StatusInProgress}' status.");
            }
            return ValidationResult.Success();
        }

        return ValidationResult.Fail($"Matches cannot be added to series with status '{seriesStatus}'.");
    }

    public ValidationResult ValidateMatchStatusTransition(Match match, Series series, string targetStatus)
    {
        if (match == null)
        {
            return ValidationResult.Fail("Match not found.");
        }
        if (series == null)
        {
            return ValidationResult.Fail("Associated series not found.");
        }

        var seriesStatus = NormalizeStatus(series.Status);
        var currentMatchStatus = NormalizeStatus(match.Status);
        var targetMatchStatus = NormalizeStatus(targetStatus);

        if (string.Equals(currentMatchStatus, targetMatchStatus, StringComparison.OrdinalIgnoreCase))
        {
            return ValidationResult.Success();
        }

        // Rule 3 & 4: If Series is Completed or Cancelled, match status cannot be changed
        if (string.Equals(seriesStatus, StatusCompleted, StringComparison.OrdinalIgnoreCase))
        {
            return ValidationResult.Fail("Cannot change match status because the series is completed.");
        }
        if (string.Equals(seriesStatus, StatusCancelled, StringComparison.OrdinalIgnoreCase))
        {
            return ValidationResult.Fail("Cannot change match status because the series is cancelled.");
        }

        // Rule 16: Match Status Transition Matrix
        switch (currentMatchStatus)
        {
            case StatusScheduled:
                if (string.Equals(targetMatchStatus, StatusInProgress, StringComparison.OrdinalIgnoreCase))
                {
                    // Rule 1, 5, 10: Scheduled -> InProgress is allowed ONLY when Series = InProgress
                    if (!string.Equals(seriesStatus, StatusInProgress, StringComparison.OrdinalIgnoreCase))
                    {
                        return ValidationResult.Fail("Cannot change match status to InProgress because the series is not InProgress.");
                    }
                    return ValidationResult.Success();
                }
                if (string.Equals(targetMatchStatus, StatusCancelled, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(targetMatchStatus, StatusAbandoned, StringComparison.OrdinalIgnoreCase))
                {
                    return ValidationResult.Success();
                }
                return ValidationResult.Fail($"Invalid match status transition from '{currentMatchStatus}' to '{targetMatchStatus}'. Allowed transitions: '{StatusInProgress}', '{StatusCancelled}', '{StatusAbandoned}'.");

            case StatusInProgress:
                if (string.Equals(targetMatchStatus, StatusCompleted, StringComparison.OrdinalIgnoreCase))
                {
                    // Rule 17: Complete Match Rule
                    return ValidateMatchCompletion(match);
                }
                if (string.Equals(targetMatchStatus, StatusCancelled, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(targetMatchStatus, StatusAbandoned, StringComparison.OrdinalIgnoreCase))
                {
                    return ValidationResult.Success();
                }
                return ValidationResult.Fail($"Invalid match status transition from '{currentMatchStatus}' to '{targetMatchStatus}'. Allowed transitions: '{StatusCompleted}', '{StatusCancelled}', '{StatusAbandoned}'.");

            case StatusCompleted:
                // Rule 7: Match Status Completed cannot be changed
                return ValidationResult.Fail("Cannot change status of a completed match.");

            case StatusCancelled:
                // Rule 8: Match Status Cancelled cannot be changed
                return ValidationResult.Fail("Cannot change status of a cancelled match.");

            case StatusAbandoned:
                // Rule 9: Match Status Abandoned cannot be changed
                return ValidationResult.Fail("Cannot change status of an abandoned match.");

            default:
                return ValidationResult.Fail($"Unknown match status '{currentMatchStatus}'.");
        }
    }

    public ValidationResult ValidateMatchCancellation(Match match, Series series)
    {
        return ValidateMatchStatusTransition(match, series, StatusCancelled);
    }

    public ValidationResult ValidateLiveScoringAllowed(Match match, Series? series)
    {
        if (match == null)
        {
            return ValidationResult.Fail("Match not found.");
        }

        var currentMatchStatus = NormalizeStatus(match.Status);
        if (!string.Equals(currentMatchStatus, StatusInProgress, StringComparison.OrdinalIgnoreCase))
        {
            return ValidationResult.Fail($"Live scoring is not allowed because match status is '{currentMatchStatus}'. Match must be '{StatusInProgress}'.");
        }

        if (series == null)
        {
            return ValidationResult.Fail("Associated series not found.");
        }

        var seriesStatus = NormalizeStatus(series.Status);
        if (!string.Equals(seriesStatus, StatusInProgress, StringComparison.OrdinalIgnoreCase))
        {
            return ValidationResult.Fail($"Live scoring is not allowed because series status is '{seriesStatus}'. Series must be '{StatusInProgress}'.");
        }

        return ValidationResult.Success();
    }

    public ValidationResult ValidateMatchCompletion(Match match)
    {
        if (match == null)
        {
            return ValidationResult.Fail("Match not found.");
        }

        // Rule 17: A match can be changed InProgress -> Completed only after required scorecard/result information has been entered.
        // At minimum verify application has required innings, batting data, bowling data, and match outcome/result.
        var inningsList = match.Innings?.OrderBy(i => i.InningsNumber).ToList() ?? new List<MatchInnings>();
        if (inningsList.Count == 0)
        {
            return ValidationResult.Fail("Cannot complete match: No innings data has been recorded.");
        }

        // At least one innings must have batting and bowling performances or ball events
        bool hasBatting = inningsList.Any(i => i.BattingPerformances != null && i.BattingPerformances.Count > 0);
        bool hasBowling = inningsList.Any(i => i.BowlingPerformances != null && i.BowlingPerformances.Count > 0);

        if (!hasBatting && !hasBowling)
        {
            // If ball events exist, that also counts as performance data
            bool hasBallEvents = inningsList.Any(i => i.BallEvents != null && i.BallEvents.Count > 0);
            if (!hasBallEvents)
            {
                return ValidationResult.Fail("Cannot complete match without batting and bowling scorecard data.");
            }
        }

        return ValidationResult.Success();
    }

    private static string NormalizeStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status)) return StatusScheduled;
        var s = status.Trim();
        if (string.Equals(s, "scheduled", StringComparison.OrdinalIgnoreCase)) return StatusScheduled;
        if (string.Equals(s, "inprogress", StringComparison.OrdinalIgnoreCase) || string.Equals(s, "in progress", StringComparison.OrdinalIgnoreCase)) return StatusInProgress;
        if (string.Equals(s, "completed", StringComparison.OrdinalIgnoreCase)) return StatusCompleted;
        if (string.Equals(s, "cancelled", StringComparison.OrdinalIgnoreCase) || string.Equals(s, "canceled", StringComparison.OrdinalIgnoreCase)) return StatusCancelled;
        if (string.Equals(s, "abandoned", StringComparison.OrdinalIgnoreCase)) return StatusAbandoned;
        return s;
    }
}
