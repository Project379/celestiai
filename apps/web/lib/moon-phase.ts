// Transitional re-export shim — Phase M1 moved the implementation to
// @stellaeum/core. Existing apps/web importers keep working unchanged.
// Future work (post-M1) can migrate importers to `@stellaeum/core/moon-phase`
// directly and delete this file.
export { getLunarPhase, ALL_LUNAR_PHASES } from '@stellaeum/core/moon-phase'
export type { LunarPhase, LunarPhaseId } from '@stellaeum/core/moon-phase'
