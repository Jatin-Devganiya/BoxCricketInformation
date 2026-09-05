/**
 * Centralized business rules for Series and Match statuses.
 * Keeps UI consistent with backend authoritative validation.
 */

export const SERIES_STATUSES = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'InProgress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export const MATCH_STATUSES = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'InProgress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  ABANDONED: 'Abandoned',
} as const;

/**
 * Returns allowed next statuses when editing an existing Series.
 */
export function getAllowedSeriesTransitions(currentStatus?: string): string[] {
  const norm = normalizeStatus(currentStatus);
  switch (norm) {
    case 'Scheduled':
      return ['Scheduled', 'InProgress', 'Cancelled'];
    case 'InProgress':
      return ['InProgress', 'Completed', 'Cancelled'];
    case 'Completed':
      return ['Completed'];
    case 'Cancelled':
      return ['Cancelled'];
    default:
      return ['Scheduled'];
  }
}

/**
 * Whether the series status can no longer be edited or changed.
 */
export function isSeriesStatusLocked(seriesStatus?: string): boolean {
  const norm = normalizeStatus(seriesStatus);
  return norm === 'Completed' || norm === 'Cancelled';
}

/**
 * Whether matches can be scheduled under this series.
 * (Rule 1, 2, 3, 4: Allowed only when Scheduled or InProgress; Blocked when Completed or Cancelled)
 */
export function canAddMatchesToSeries(seriesStatus?: string): boolean {
  const norm = normalizeStatus(seriesStatus);
  return norm === 'Scheduled' || norm === 'InProgress';
}

/**
 * Returns allowed statuses for newly created matches under a series.
 * (Rule 11: Scheduled -> Scheduled only; InProgress -> Scheduled or InProgress; Completed/Cancelled -> none)
 */
export function getAllowedMatchCreationStatuses(seriesStatus?: string): string[] {
  const norm = normalizeStatus(seriesStatus);
  if (norm === 'Scheduled') {
    return ['Scheduled'];
  }
  if (norm === 'InProgress') {
    return ['Scheduled', 'InProgress'];
  }
  return [];
}

/**
 * Returns allowed next statuses when updating an existing Match.
 * (Rule 15 & 16)
 */
export function getAllowedMatchTransitions(currentMatchStatus?: string, seriesStatus?: string): string[] {
  const normSeries = normalizeStatus(seriesStatus);
  const normMatch = normalizeStatus(currentMatchStatus);

  // If Series is Completed or Cancelled, match status is completely locked
  if (normSeries === 'Completed' || normSeries === 'Cancelled') {
    return [normMatch];
  }

  switch (normMatch) {
    case 'Scheduled':
      // Scheduled -> InProgress is allowed ONLY when Series is InProgress
      if (normSeries === 'InProgress') {
        return ['Scheduled', 'InProgress', 'Cancelled', 'Abandoned'];
      }
      // When Series is Scheduled, cannot move to InProgress
      return ['Scheduled', 'Cancelled', 'Abandoned'];

    case 'InProgress':
      return ['InProgress', 'Completed', 'Cancelled', 'Abandoned'];

    case 'Completed':
      return ['Completed'];

    case 'Cancelled':
      return ['Cancelled'];

    case 'Abandoned':
      return ['Abandoned'];

    default:
      return ['Scheduled'];
  }
}

/**
 * Whether the match status can no longer be changed.
 */
export function isMatchStatusLocked(matchStatus?: string, seriesStatus?: string): boolean {
  const normSeries = normalizeStatus(seriesStatus);
  const normMatch = normalizeStatus(matchStatus);

  if (normSeries === 'Completed' || normSeries === 'Cancelled') return true;
  return normMatch === 'Completed' || normMatch === 'Cancelled' || normMatch === 'Abandoned';
}

/**
 * Rule 10, 21:
 * Match = Scheduled, Series = Scheduled -> Start Match = Disabled
 * Match = Scheduled, Series = InProgress -> Start Match = Enabled
 */
export function canStartMatch(matchStatus?: string, seriesStatus?: string): boolean {
  const normSeries = normalizeStatus(seriesStatus);
  const normMatch = normalizeStatus(matchStatus);
  return normMatch === 'Scheduled' && normSeries === 'InProgress';
}

/**
 * Rule 12, 21:
 * Live scoring allowed ONLY when Series = InProgress AND Match = InProgress
 */
export function canLiveScore(matchStatus?: string, seriesStatus?: string): boolean {
  const normSeries = normalizeStatus(seriesStatus);
  const normMatch = normalizeStatus(matchStatus);
  return normMatch === 'InProgress' && normSeries === 'InProgress';
}

/**
 * Rule 22: Exact notification message for the Series notification bar.
 */
export function getSeriesNotificationMessage(seriesStatus?: string): string {
  const norm = normalizeStatus(seriesStatus);
  switch (norm) {
    case 'Scheduled':
      return 'This series is Scheduled. Matches cannot be played until series status is InProgress.';
    case 'InProgress':
      return 'Series is InProgress. Matches can now be played and scored live.';
    case 'Completed':
      return 'This series is Completed. All match results and statistics are finalized. No new matches can be added.';
    case 'Cancelled':
      return 'This series has been Cancelled. No further matches can be played.';
    default:
      return 'Select a series to view scheduling options.';
  }
}

function normalizeStatus(status?: string): string {
  if (!status) return 'Scheduled';
  const s = status.trim().toLowerCase();
  if (s === 'scheduled') return 'Scheduled';
  if (s === 'inprogress' || s === 'in progress') return 'InProgress';
  if (s === 'completed') return 'Completed';
  if (s === 'cancelled' || s === 'canceled') return 'Cancelled';
  if (s === 'abandoned') return 'Abandoned';
  return status.trim();
}
