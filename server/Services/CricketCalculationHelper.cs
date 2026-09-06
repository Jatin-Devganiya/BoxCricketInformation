using CricketApp.Api.Models;

namespace CricketApp.Api.Services;

public static class CricketCalculationHelper
{
    /// <summary>
    /// Converts legal balls into cricket over notation (e.g., 11 balls => "1.5", 6 balls => "1.0", 36 balls => "6.0")
    /// </summary>
    public static string ToCricketOvers(int legalBalls)
    {
        if (legalBalls <= 0) return "0.0";
        int completedOvers = legalBalls / 6;
        int remainingBalls = legalBalls % 6;
        return $"{completedOvers}.{remainingBalls}";
    }

    /// <summary>
    /// Computes batting strike rate (Runs / BallsFaced * 100)
    /// </summary>
    public static double CalculateStrikeRate(int runs, int ballsFaced)
    {
        if (ballsFaced <= 0) return 0.0;
        return Math.Round((double)runs / ballsFaced * 100.0, 2);
    }

    /// <summary>
    /// Computes bowling economy rate (RunsConceded / (BallsBowled / 6.0))
    /// </summary>
    public static double CalculateEconomyRate(int runsConceded, int ballsBowled)
    {
        if (ballsBowled <= 0) return 0.0;
        double overs = (double)ballsBowled / 6.0;
        return Math.Round(runsConceded / overs, 2);
    }

    /// <summary>
    /// Calculates the number of hat-tricks achieved by a bowler from their delivery sequence in an innings.
    /// A hat-trick occurs when the same bowler takes 3 wickets on 3 consecutive legal deliveries.
    /// Non-legal deliveries (Wide, NoBall, DeadBall) do not count as legal balls and do not break the streak.
    /// Dismissals not credited to the bowler (e.g. Run Out) do not count as bowler wickets and break the streak.
    /// Subsequent wickets beyond 3 do not grant additional hat-tricks unless a new independent sequence of 3 is completed.
    /// </summary>
    public static int CalculateHatTricks(IEnumerable<BallEvent> bowlerDeliveries)
    {
        if (bowlerDeliveries == null) return 0;

        int consecutiveWickets = 0;
        int hatTricks = 0;

        foreach (var ball in bowlerDeliveries.OrderBy(b => b.Id))
        {
            bool isNonLegal = !ball.IsLegalBall ||
                              ball.EventType == "Wide" ||
                              ball.EventType == "NoBall" ||
                              ball.EventType == "DeadBall" ||
                              ball.ExtraType == "Wide" ||
                              ball.ExtraType == "NoBall";

            if (isNonLegal)
            {
                // Wide / No Ball / Dead Ball is not a legal delivery; does NOT break the hat-trick sequence
                continue;
            }

            // Legal delivery:
            if (ball.IsWicket && ball.BowlerCreditedWicket)
            {
                consecutiveWickets++;
                if (consecutiveWickets == 3)
                {
                    hatTricks++;
                    consecutiveWickets = 0; // Reset sequence so 4th/5th wicket does not trigger another hat-trick
                }
            }
            else
            {
                // Normal legal delivery without a bowler-credited wicket (runs, dots, leg byes, or Run Out) breaks the streak
                consecutiveWickets = 0;
            }
        }

        return hatTricks;
    }
}
