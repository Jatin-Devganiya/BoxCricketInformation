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
}
