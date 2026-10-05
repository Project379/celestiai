/**
 * Birth-data edit copy — ONE source for web and mobile so the message is
 * word-identical on both platforms. Lives under i18n/strings/ (a content home,
 * see packages/config/eslint/no-new-bg-strings.cjs) and is locked by
 * scripts/i18n/copy-lock.json like every other Cyrillic literal.
 *
 * Approved by the founder 2026-10-01. Shown once after a successful edit
 * (~4s, tap to dismiss, announced to screen readers).
 */
export const BIRTH_DATA_SAVED_MESSAGE = 'Данните са запазени. Картата ти е обновена.'

/**
 * Label of the entry row on web «Ти» / mobile Ти that opens the birth-data edit.
 * PENDING FOUNDER APPROVAL: this wording comes from the approved mobile edit
 * mock-up, where all Bulgarian was marked placeholder; only the post-save
 * message above has been approved. Held here (not inline) so approving or
 * changing it is a one-line, copy-locked edit shared by both platforms.
 */
export const BIRTH_DATA_ENTRY_LABEL = 'Рождени данни'
