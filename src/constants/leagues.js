/**
 * Central league/year mapping.
 * Add new leagues here — all pages and hooks import from this single source.
 */

export const LEAGUES = {
    '2a40e26e20e846cbae7b66d53c1488f0': { year: '2025', salmonName: '1BS' },
    'fe08d6855f204613b30922e34a7486c6': { year: '2026', salmonName: '1AS' },
}

export const DEFAULT_LEAGUE_ID = 'fe08d6855f204613b30922e34a7486c6'

/** year string → league ID, e.g. '2025' → '2a40e26e20e846cbae7b66d53c1488f0' */
export const YEAR_TO_LEAGUE = Object.fromEntries(
    Object.entries(LEAGUES).map(([id, { year }]) => [year, id])
)

/** league ID → year string */
export const LEAGUE_YEARS = Object.fromEntries(
    Object.entries(LEAGUES).map(([id, { year }]) => [id, year])
)

/** salmon year key (lowercase) → league ID, e.g. '1bs' → '2a40e...' */
export const SALMON_YEAR_MAP = Object.fromEntries(
    Object.entries(LEAGUES)
        .filter(([, { salmonName }]) => salmonName)
        .map(([id, { salmonName }]) => [salmonName.toLowerCase(), id])
)

/** league ID → salmon display name */
export const SALMON_NAMES = Object.fromEntries(
    Object.entries(LEAGUES)
        .filter(([, { salmonName }]) => salmonName)
        .map(([id, { salmonName }]) => [id, salmonName])
)
