import { Share } from 'react-native'

/**
 * Mobile GDPR data export via react-native's built-in Share API — same
 * no-new-dep pattern as the diary markdown export (lib/diary/export.ts,
 * P.4-d). The exported payload is larger (profile + charts + readings +
 * horoscopes + diary), so it carries the same Android Intent.EXTRA_TEXT
 * truncation risk already tracked under REVISIT-43 for diary export.
 */
export async function shareAccountExport(
  apiFetch: (path: string) => Promise<unknown>,
): Promise<void> {
  const data = await apiFetch('/api/gdpr/export')
  await Share.share({
    message: JSON.stringify(data, null, 2),
    title: 'Данните ми в Stellaeum',
  })
}
