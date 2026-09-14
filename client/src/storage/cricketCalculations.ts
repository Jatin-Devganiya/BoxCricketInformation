import { DbBallEvent } from './dbSchema';

/**
 * Calculates cricket display over notation from legal balls.
 * 6 balls => 1.0, 11 balls => 1.5, 36 balls => 6.0
 */
export function toCricketOvers(legalBalls: number): string {
  if (!legalBalls || legalBalls <= 0) return '0.0';
  const completedOvers = Math.floor(legalBalls / 6);
  const remainingBalls = legalBalls % 6;
  return `${completedOvers}.${remainingBalls}`;
}

/**
 * Computes batting strike rate (Runs / BallsFaced * 100)
 */
export function calculateStrikeRate(runs: number, ballsFaced: number): number {
  if (!ballsFaced || ballsFaced <= 0) return 0.0;
  return Math.round(((runs / ballsFaced) * 100.0) * 100) / 100;
}

/**
 * Computes bowling economy rate (RunsConceded / (BallsBowled / 6.0))
 */
export function calculateEconomyRate(runsConceded: number, ballsBowled: number): number {
  if (!ballsBowled || ballsBowled <= 0) return 0.0;
  const overs = ballsBowled / 6.0;
  return Math.round((runsConceded / overs) * 100) / 100;
}

/**
 * Calculates the number of hat-tricks achieved by a bowler from their delivery sequence in an innings.
 * Exact rule:
 * - 3 wickets by the same bowler on 3 consecutive legal deliveries
 * - Non-legal deliveries (Wide, NoBall, DeadBall) do not count as legal balls and do NOT break the streak
 * - Normal legal non-wicket breaks the sequence
 * - Dismissals not credited to bowler (Run Out) break the sequence
 * - Subsequent wickets beyond 3 do not grant another hat-trick unless another sequence of 3 is completed
 */
export function calculateHatTricks(bowlerDeliveries: DbBallEvent[]): number {
  if (!bowlerDeliveries || bowlerDeliveries.length === 0) return 0;

  // Ensure deliveries are sorted in chronological delivery order
  const sorted = [...bowlerDeliveries].sort((a, b) => {
    if (a.overNumber !== b.overNumber) return a.overNumber - b.overNumber;
    return a.deliveryNumber - b.deliveryNumber;
  });

  let consecutiveWickets = 0;
  let hatTricks = 0;

  for (const ball of sorted) {
    const isNonLegal =
      !ball.isLegalBall ||
      ball.eventType === 'Wide' ||
      ball.eventType === 'NoBall' ||
      ball.eventType === 'DeadBall' ||
      ball.extraType === 'Wide' ||
      ball.extraType === 'NoBall';

    if (isNonLegal) {
      // Non-legal delivery: does not break streak
      continue;
    }

    // Legal delivery:
    if (ball.isWicket && ball.bowlerCreditedWicket) {
      consecutiveWickets++;
      if (consecutiveWickets === 3) {
        hatTricks++;
        consecutiveWickets = 0; // Reset sequence so 4th wicket does not trigger another hat-trick
      }
    } else {
      // Normal legal delivery without a bowler-credited wicket breaks the streak
      consecutiveWickets = 0;
    }
  }

  return hatTricks;
}
