// Re-export shim — moved to @stellaeum/core/i18n/bg-grammar so web can share
// it too (previously mobile-only, web had independent re-implementations).
// Existing mobile importers keep working unchanged.
export { formatDaysHours } from '@stellaeum/core/i18n/bg-grammar'
