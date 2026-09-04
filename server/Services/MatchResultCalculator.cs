using CricketApp.Api.Models;

namespace CricketApp.Api.Services;

public class MatchResultCalculationResult
{
    public string ResultDescription { get; set; } = "Result pending";
    public string ResultType { get; set; } = "pending"; // "runs", "wickets", "tie", "abandoned", "no_result", "pending"
    public int? WinningTeamId { get; set; }
    public string? WinningTeamName { get; set; }
    public int? WinningMargin { get; set; }
    public bool IsComplete { get; set; }
    public string? Summary { get; set; }
}

public static class MatchResultCalculator
{
    public const int DefaultTotalWickets = 10;

    /// <summary>
    /// Authoritatively calculates the cricket-style match result description and winning metrics
    /// based purely on completed innings data and actual match conditions.
    /// </summary>
    public static MatchResultCalculationResult Calculate(Match match, int? customTotalWickets = null, int? customTargetRuns = null)
    {
        var result = new MatchResultCalculationResult();

        if (match == null)
        {
            result.ResultDescription = "Result pending";
            result.ResultType = "pending";
            return result;
        }

        // Case 8: Abandoned / Cancelled / No Result statuses
        var status = match.Status?.Trim() ?? string.Empty;
        if (string.Equals(status, "Abandoned", StringComparison.OrdinalIgnoreCase))
        {
            result.ResultDescription = "Match abandoned";
            result.ResultType = "abandoned";
            result.IsComplete = true;
            return result;
        }
        if (string.Equals(status, "Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            result.ResultDescription = "Match cancelled";
            result.ResultType = "cancelled";
            result.IsComplete = true;
            return result;
        }
        if (string.Equals(status, "NoResult", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(status, "No Result", StringComparison.OrdinalIgnoreCase))
        {
            result.ResultDescription = "No result";
            result.ResultType = "no_result";
            result.IsComplete = true;
            return result;
        }

        // Must determine innings order from actual InningsNumber (1 vs 2)
        var inningsList = match.Innings?.OrderBy(i => i.InningsNumber).ToList() ?? new List<MatchInnings>();
        var inn1 = inningsList.FirstOrDefault(i => i.InningsNumber == 1);
        var inn2 = inningsList.FirstOrDefault(i => i.InningsNumber == 2);

        // Case 14: Missing or incomplete innings data
        if (inn1 == null)
        {
            result.ResultDescription = "Result pending";
            result.ResultType = "pending";
            return result;
        }

        // Resolve Team names dynamically (never hardcoded, never assuming Team1 is first batting team)
        string inn1TeamName = ResolveTeamName(match, inn1.TeamId, inn1.Team?.Name);

        // If only first innings exists so far
        if (inn2 == null)
        {
            result.ResultDescription = "Result pending";
            result.ResultType = "pending";
            result.Summary = $"{inn1TeamName} scored {inn1.Runs}/{inn1.Wickets} (Innings 1 Complete)";
            return result;
        }

        string inn2TeamName = ResolveTeamName(match, inn2.TeamId, inn2.Team?.Name);

        int maxWickets = customTotalWickets.HasValue && customTotalWickets.Value > 0
            ? customTotalWickets.Value
            : DefaultTotalWickets;

        int inn1Runs = inn1.Runs;
        int inn2Runs = inn2.Runs;
        int inn2Wickets = inn2.Wickets;

        // Case 9: DLS / Adjusted Target Support
        // If custom target is specified, use it; otherwise target is inn1.Runs + 1
        int targetRuns = (customTargetRuns.HasValue && customTargetRuns.Value > 0)
            ? customTargetRuns.Value
            : (inn1Runs + 1);

        // CASE 1, 3, 4: SECOND INNINGS (CHASING TEAM) REACHES OR EXCEEDS TARGET
        if (inn2Runs >= targetRuns)
        {
            int wicketsRemaining = Math.Max(0, maxWickets - inn2Wickets);
            string wicketSuffix = wicketsRemaining == 1 ? "1 wicket" : $"{wicketsRemaining} wickets";

            result.WinningTeamId = inn2.TeamId;
            result.WinningTeamName = inn2TeamName;
            result.WinningMargin = wicketsRemaining;
            result.ResultType = "wickets";
            result.ResultDescription = $"{inn2TeamName} won by {wicketSuffix}";
            result.IsComplete = true;
            result.Summary = $"{inn2TeamName} chased {targetRuns} ({inn2Runs}/{inn2Wickets})";
            return result;
        }

        // Check if second innings or match has completed (all out, overs completed, or marked completed)
        bool isMatchFinalized = string.Equals(match.Status, "Completed", StringComparison.OrdinalIgnoreCase);
        bool isInnings2Finished = string.Equals(inn2.Status, "Completed", StringComparison.OrdinalIgnoreCase)
            || inn2Wickets >= maxWickets
            || (match.RequiredOvers > 0 && inn2.Balls >= match.RequiredOvers * 6);

        if (isMatchFinalized || isInnings2Finished)
        {
            // CASE 5: TIE
            if (inn1Runs == inn2Runs)
            {
                result.WinningTeamId = null;
                result.WinningTeamName = null;
                result.WinningMargin = 0;
                result.ResultType = "tie";
                result.ResultDescription = "Match tied";
                result.IsComplete = true;
                result.Summary = $"Scores level ({inn1Runs} - {inn2Runs})";
                return result;
            }

            // CASE 2: FIRST INNINGS TEAM WINS (CHASING TEAM FAILED TO REACH TARGET)
            if (inn1Runs > inn2Runs)
            {
                int runMargin = inn1Runs - inn2Runs;
                string runSuffix = runMargin == 1 ? "1 run" : $"{runMargin} runs";

                result.WinningTeamId = inn1.TeamId;
                result.WinningTeamName = inn1TeamName;
                result.WinningMargin = runMargin;
                result.ResultType = "runs";
                result.ResultDescription = $"{inn1TeamName} won by {runSuffix}";
                result.IsComplete = true;
                result.Summary = $"{inn1TeamName} defended {inn1Runs} (restricted {inn2TeamName} to {inn2Runs}/{inn2Wickets})";
                return result;
            }
        }

        // Innings in progress
        int remainingToChase = targetRuns - inn2Runs;
        result.ResultDescription = "Result pending";
        result.ResultType = "pending";
        result.IsComplete = false;
        result.Summary = $"{inn2TeamName} need {remainingToChase} run{(remainingToChase == 1 ? "" : "s")} to win";
        return result;
    }

    private static string ResolveTeamName(Match match, int teamId, string? inningsTeamName)
    {
        if (!string.IsNullOrWhiteSpace(inningsTeamName)) return inningsTeamName.Trim();
        if (teamId == match.Team1Id && !string.IsNullOrWhiteSpace(match.Team1?.Name)) return match.Team1.Name.Trim();
        if (teamId == match.Team2Id && !string.IsNullOrWhiteSpace(match.Team2?.Name)) return match.Team2.Name.Trim();
        if (teamId == match.Team1Id && !string.IsNullOrWhiteSpace(match.Team1?.ShortName)) return match.Team1.ShortName.Trim();
        if (teamId == match.Team2Id && !string.IsNullOrWhiteSpace(match.Team2?.ShortName)) return match.Team2.ShortName.Trim();
        return teamId == match.Team1Id ? "Team 1" : "Team 2";
    }
}
