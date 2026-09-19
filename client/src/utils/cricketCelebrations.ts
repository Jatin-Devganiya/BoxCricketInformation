export type CelebrationType = 'SIX' | 'FOUR' | 'WICKET' | 'FIFTY' | 'CENTURY' | 'MILESTONE' | 'HAT_TRICK';

export interface CelebrationEvent {
  id: string;
  type: CelebrationType;
  playerName: string;
  runs?: number;
  wicketType?: string;
  subtitle?: string;
  milestone?: number;
  durationMs: number;
}

// Extensible list of batting milestones (50, 100, 150, 200, 250, 300...)
export const BATTING_MILESTONES = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];

export interface MilestoneDetails {
  type: CelebrationType;
  title: string;
  subtitle: string;
  durationMs: number;
}

export const getMilestoneDetails = (milestone: number): MilestoneDetails => {
  if (milestone === 50) {
    return {
      type: 'FIFTY',
      title: 'FIFTY!',
      subtitle: 'Half Century!',
      durationMs: 3000,
    };
  }
  if (milestone === 100) {
    return {
      type: 'CENTURY',
      title: 'CENTURY!',
      subtitle: 'What a Century!',
      durationMs: 3500,
    };
  }
  if (milestone === 150) {
    return {
      type: 'MILESTONE',
      title: '150!',
      subtitle: 'INCREDIBLE!',
      durationMs: 3500,
    };
  }
  if (milestone === 200) {
    return {
      type: 'MILESTONE',
      title: 'DOUBLE CENTURY!',
      subtitle: 'Magnificent Double Century!',
      durationMs: 4000,
    };
  }
  if (milestone === 250) {
    return {
      type: 'MILESTONE',
      title: '250 MILESTONE!',
      subtitle: 'Colossal 250 Runs!',
      durationMs: 4000,
    };
  }
  if (milestone === 300) {
    return {
      type: 'MILESTONE',
      title: 'TRIPLE CENTURY!',
      subtitle: 'Legendary Triple Century!',
      durationMs: 4000,
    };
  }
  return {
    type: 'MILESTONE',
    title: `${milestone}!`,
    subtitle: `Sensational ${milestone} Runs!`,
    durationMs: 3500,
  };
};

/**
 * Detects whether any milestone was crossed between previousRuns and currentRuns.
 * Triggered ONLY when previousRuns < milestone and currentRuns >= milestone.
 */
export const detectCrossedMilestones = (previousRuns: number, currentRuns: number): number[] => {
  if (currentRuns <= previousRuns) return [];
  return BATTING_MILESTONES.filter((m) => previousRuns < m && currentRuns >= m);
};

export interface BuildCelebrationParams {
  eventType?: string; // Normal, NoBall, Wide, LegBye, DeadBall, Wicket
  batRuns?: number; // runs off the bat
  previousStrikerRuns?: number;
  currentStrikerRuns?: number;
  strikerName?: string;
  isWicket?: boolean;
  wicketType?: string;
  dismissedPlayerName?: string;
  isHatTrick?: boolean;
  bowlerName?: string;
}

/**
 * Builds a prioritized queue of celebration events.
 * Priority order per requirements: WICKET -> HAT_TRICK -> MILESTONE (FIFTY/CENTURY) -> SIX -> FOUR.
 */
export const buildCelebrationEvents = (params: BuildCelebrationParams): CelebrationEvent[] => {
  const events: CelebrationEvent[] = [];
  const timestamp = Date.now();

  // 1. WICKET Event
  if (params.isWicket) {
    events.push({
      id: `wicket-${timestamp}`,
      type: 'WICKET',
      playerName: params.dismissedPlayerName || params.strikerName || 'Batsman',
      wicketType: params.wicketType || 'Out',
      subtitle: params.wicketType ? `${params.wicketType}!` : 'Wicket Down!',
      durationMs: 2500,
    });
  }

  // 1b. HAT-TRICK Event
  if (params.isHatTrick && params.bowlerName) {
    events.push({
      id: `hattrick-${timestamp}`,
      type: 'HAT_TRICK',
      playerName: params.bowlerName,
      subtitle: '3 Wickets in 3 Consecutive Balls!',
      durationMs: 4000,
    });
  }

  // 2. MILESTONE Events (FIFTY, CENTURY, 150, 200, etc.)
  if (
    typeof params.previousStrikerRuns === 'number' &&
    typeof params.currentStrikerRuns === 'number' &&
    params.strikerName
  ) {
    const crossed = detectCrossedMilestones(params.previousStrikerRuns, params.currentStrikerRuns);
    for (const milestone of crossed) {
      const details = getMilestoneDetails(milestone);
      events.push({
        id: `milestone-${milestone}-${timestamp}`,
        type: details.type,
        playerName: params.strikerName,
        runs: params.currentStrikerRuns,
        milestone,
        subtitle: details.subtitle,
        durationMs: details.durationMs,
      });
    }
  }

  // 3. BOUNDARY Events (SIX or FOUR)
  if (params.batRuns === 6 && params.strikerName) {
    events.push({
      id: `six-${timestamp}`,
      type: 'SIX',
      playerName: params.strikerName,
      runs: 6,
      subtitle: 'Massive Six!',
      durationMs: 2500,
    });
  } else if (params.batRuns === 4 && params.strikerName) {
    events.push({
      id: `four-${timestamp}`,
      type: 'FOUR',
      playerName: params.strikerName,
      runs: 4,
      subtitle: 'Boundary!',
      durationMs: 2000,
    });
  }

  return events;
};
