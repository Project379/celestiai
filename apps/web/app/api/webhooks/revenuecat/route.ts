import { after } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { logAuditEvent } from '@/lib/audit'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { handleRevenueCatEvent, type RevenueCatEvent } from '@/lib/revenuecat/webhook-events'

/**
 * POST /api/webhooks/revenuecat
 *
 * REVISIT-62 — the RevenueCat -> users.subscription_tier sync webhook.
 * Without this, a real mobile purchase charges the user and grants
 * premium nowhere in the app.
 *
 * CRITICAL: uses request.text() (raw body), never request.json() —
 * signature verification requires the exact raw bytes, same discipline
 * as the Stripe webhook route.
 *
 * Signature: HMAC-SHA256 over "<timestamp>.<raw_body>" using the
 * RevenueCat integration's signing secret, header format
 * X-RevenueCat-Webhook-Signature: t=<unix_seconds>,v1=<hex_hmac>.
 * Fails closed: a missing/malformed secret rejects every request rather
 * than skipping verification — this route grants premium access, so a
 * misconfigured env var must never silently disable auth on it.
 *
 * Idempotency: INSERT into processed_revenuecat_events FIRST, before any
 * processing, and let the table's UNIQUE(event_id) constraint gate
 * concurrent duplicates atomically. Deliberately not a check-then-write
 * (SELECT for existing, then INSERT after processing) — two identical
 * deliveries racing a check-then-write could both pass the check before
 * either writes. Insert-first means only one caller can ever win the
 * unique index; the other gets 23505 back near-instantly, before doing
 * any work. If processing then fails after the insert succeeded, the
 * marker is deleted in the catch block so RevenueCat's automatic retry
 * can reprocess — insert-first buys race-safety without also silently
 * eating a real failure as "already handled."
 *
 * Not rate-limited: request authenticity is enforced via HMAC signature
 * verification (below), a stronger control than a request-count limit here.
 * If this handler ever accepts requests without signature verification, it
 * needs rate limiting.
 */

const SIGNATURE_TOLERANCE_SECONDS = 300 // 5 minutes, replay-attack guard

export async function POST(request: Request) {
  const body = await request.text()
  const signatureHeader = request.headers.get('x-revenuecat-webhook-signature')

  const secret = process.env.REVENUECAT_WEBHOOK_SECRET
  if (!secret) {
    console.error(
      '[RevenueCat Webhook] REVENUECAT_WEBHOOK_SECRET is not set — rejecting all requests. A missing secret must never silently disable verification on a route that grants premium.'
    )
    return new Response('Webhook not configured', { status: 500 })
  }

  if (!signatureHeader) {
    return new Response('Missing signature header', { status: 401 })
  }

  const match = /^t=(\d+),v1=([0-9a-fA-F]+)$/.exec(signatureHeader)
  if (!match) {
    console.error('[RevenueCat Webhook] Malformed signature header:', signatureHeader)
    return new Response('Malformed signature header', { status: 401 })
  }
  const [, timestampStr, providedSignatureHex] = match

  const expectedSignatureHex = createHmac('sha256', secret)
    .update(`${timestampStr}.${body}`)
    .digest('hex')

  const providedBuffer = Buffer.from(providedSignatureHex, 'hex')
  const expectedBuffer = Buffer.from(expectedSignatureHex, 'hex')

  // Lengths must match before timingSafeEqual — it throws on mismatched
  // buffer lengths rather than returning false.
  const signatureValid =
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)

  if (!signatureValid) {
    console.error('[RevenueCat Webhook] Signature verification failed')
    return new Response('Invalid signature', { status: 401 })
  }

  const timestampSeconds = Number(timestampStr)
  const nowSeconds = Date.now() / 1000
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS
  ) {
    console.error(`[RevenueCat Webhook] Signature timestamp outside tolerance: t=${timestampStr}`)
    return new Response('Signature timestamp outside tolerance', { status: 401 })
  }

  let payload: { event?: RevenueCatEvent; api_version?: string }
  try {
    payload = JSON.parse(body)
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }

  const event = payload.event
  if (!event?.id || !event?.type) {
    return new Response('Malformed event payload', { status: 400 })
  }

  const supabase = createServiceSupabaseClient()

  const { error: insertError } = await supabase
    .from('processed_revenuecat_events')
    .insert({ event_id: event.id, event_type: event.type })

  if (insertError) {
    if (insertError.code === '23505') {
      console.log(`[RevenueCat Webhook] Duplicate event ignored: ${event.id} (${event.type})`)
      return new Response('OK', { status: 200 })
    }
    console.error(
      '[RevenueCat Webhook] Failed to record processed event:',
      insertError.message
    )
    return new Response('Processing error', { status: 500 })
  }

  after(() =>
    logAuditEvent(null, 'system.payment.revenuecat_webhook_received', {
      eventId: event.id,
      eventType: event.type,
    })
  )

  try {
    await handleRevenueCatEvent(event)
    return new Response('OK', { status: 200 })
  } catch (err) {
    const { error: deleteError } = await supabase
      .from('processed_revenuecat_events')
      .delete()
      .eq('event_id', event.id)

    if (deleteError) {
      console.error(
        `[RevenueCat Webhook] Failed to roll back processed-event marker for ${event.id} after a processing error — retries will be swallowed as duplicates until this is fixed manually:`,
        deleteError.message
      )
    }

    const message = err instanceof Error ? err.message : String(err)
    console.error(`[RevenueCat Webhook] Processing error for event ${event.id}:`, message)
    return new Response(`Processing error: ${message}`, { status: 500 })
  }
}
