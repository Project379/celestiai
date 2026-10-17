import webpush from 'web-push'
import { Expo } from 'expo-server-sdk'
import { getDiaryDate, getNextReminderDueAt } from '@stellaeum/core/diary/time'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { verifyCronSecret } from '@/lib/auth/cron-secret'

export const maxDuration = 300

const PAGE_SIZE = 100
const TITLE = 'Време за твоя дневник'
const BODY = 'Отдели кратък момент за себе си.'

type Preference = { user_id: string; local_time: string; timezone: string }

export async function GET(request: Request) {
  if (!verifyCronSecret(request.headers.get('Authorization'), process.env.CRON_SECRET?.trim())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const probe = new URL(request.url).searchParams.get('probe') === '1'
  const supabase = createServiceSupabaseClient()
  const now = new Date()
  let offset = 0
  let eligible = 0
  let suppressed = 0
  let sent = 0
  let failed = 0

  while (true) {
    const { data, error } = await supabase
      .from('diary_reminder_preferences')
      .select('user_id, local_time, timezone')
      .eq('enabled', true)
      .lte('next_due_at', now.toISOString())
      .order('user_id', { ascending: true })
      .range(probe ? offset : 0, probe ? offset + PAGE_SIZE - 1 : PAGE_SIZE - 1)
    if (error) return Response.json({ error: 'preference fetch failed' }, { status: 500 })
    const page = (data ?? []) as Preference[]
    for (const preference of page) {
      eligible++
      if (probe) continue
      const diaryDate = getDiaryDate(now, preference.timezone)
      const { data: completed } = await supabase
        .from('diary_entries')
        .select('id')
        .eq('user_id', preference.user_id)
        .eq('entry_date', diaryDate)
        .eq('status', 'completed')
        .limit(1)
        .maybeSingle()
      if (completed) {
        suppressed++
        await advancePreference(supabase, preference, now)
        continue
      }

      const { error: claimError } = await supabase
        .from('diary_reminder_deliveries')
        .insert({ user_id: preference.user_id, diary_date: diaryDate })
      if (claimError) {
        if (claimError.code === '23505') await advancePreference(supabase, preference, now)
        continue
      }

      const result = await deliverReminder(supabase, preference.user_id)
      sent += result.sent
      failed += result.failed
      if (result.sent > 0) {
        await supabase.from('diary_reminder_deliveries').update({ sent_at: new Date().toISOString() })
          .eq('user_id', preference.user_id).eq('diary_date', diaryDate)
      } else {
        await supabase.from('diary_reminder_deliveries').delete()
          .eq('user_id', preference.user_id).eq('diary_date', diaryDate)
      }
      await advancePreference(supabase, preference, now)
    }
    if (page.length < PAGE_SIZE) break
    if (probe) offset += PAGE_SIZE
  }
  return Response.json({ probe, eligible, suppressed, sent, failed })
}

async function advancePreference(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  preference: Preference,
  now: Date,
) {
  await supabase.from('diary_reminder_preferences')
    .update({ next_due_at: getNextReminderDueAt(String(preference.local_time).slice(0, 5), preference.timezone, new Date(now.getTime() + 60_000)).toISOString() })
    .eq('user_id', preference.user_id)
}

async function deliverReminder(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  userId: string,
) {
  const [webRows, mobileRows] = await Promise.all([
    supabase.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId).eq('diary_enabled', true),
    supabase.from('push_tokens').select('token').eq('user_id', userId).eq('diary_enabled', true).is('revoked_at', null),
  ])
  let sent = 0
  let failed = 0
  if (!webRows.error && webRows.data?.length) {
    try {
      webpush.setVapidDetails('mailto:hello@stellaeum.com', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)
      const payload = JSON.stringify({ title: TITLE, body: BODY, icon: '/icon-192x192.png', url: '/rhythm/journal' })
      const results = await Promise.allSettled(webRows.data.map((row) => webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload)))
      sent += results.filter((result) => result.status === 'fulfilled').length
      failed += results.filter((result) => result.status === 'rejected').length
    } catch {
      failed += webRows.data.length
    }
  }
  if (!mobileRows.error && mobileRows.data?.length) {
    const expo = new Expo()
    const messages = mobileRows.data.filter((row) => Expo.isExpoPushToken(row.token)).map((row) => ({
      to: row.token, title: TITLE, body: BODY, sound: 'default' as const, data: { url: '/rhythm/journal' },
    }))
    for (const chunk of expo.chunkPushNotifications(messages)) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk)
        sent += tickets.filter((ticket) => ticket.status === 'ok').length
        failed += tickets.filter((ticket) => ticket.status === 'error').length
      } catch { failed += chunk.length }
    }
  }
  return { sent, failed }
}
