# Днес v2 + monthly sign texts: go-live checklist

In order. Do not skip ahead: later steps assume earlier ones are done and checked. Nothing here has been run; every command is for you to run. Secrets are listed by NAME only.

Where things stand: `ui-parity` is ahead of `origin` and unpushed. `main` deploys to production on push. Both Днес flags default OFF, so merging changes nothing a user sees until a flag is flipped.

## 0. Before anything

- [ ] You have approved the 12 evergreen texts (`EVERGREEN-12.md`). If you change any, say so; they are copy-locked.
- [ ] `pnpm run check:all` is green on `ui-parity` (it was at the last commit).

## 1. Apply the `sign_month_texts` migration (never `db push`)

The code tolerates the table being missing (it serves the evergreen texts and the smoke probe skips with a warning), so this can happen after the merge. Do it before the 24th of the month you want the first texts for.

1. Make sure `supabase/migrations/20261009120000_sign_month_texts.sql` is on `main` (step 4).
2. Take the production `DATABASE_URL` and swap the pooler port `:6543` for the session port `:5432`.
3. Run, in one transaction:
   `psql "<DATABASE_URL with :5432>" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261009120000_sign_month_texts.sql`
4. Record it in the ledger: `supabase migration repair --status applied 20261009120000`
5. Verify: `select count(*) from public.sign_month_texts;` returns `0`; check RLS is on: `select relrowsecurity from pg_class where relname = 'sign_month_texts';` returns `t`.
6. Note: the ledger already has one row (`20260928120000 full_diary_v2`) with no file in this checkout (register row MIGRATION-PROCESS-GAP). Do not "fix" it here.

## 2. Resend account and domain (for the veto email)

No email provider existed in the app. The review email is sent through Resend's HTTP API.

1. Create a Resend account (resend.com) with an address you control.
2. In Resend, Domains, Add Domain: use the domain you will send from (the app's own domain or a subdomain such as a `mail.` one; a subdomain keeps it apart from any other mail setup).
3. Resend shows DNS records (an SPF TXT, a DKIM record, and optionally DMARC). Add each at your DNS host exactly as shown.
4. Wait for the domain to show Verified in Resend (minutes to a few hours).
5. API Keys, Create API Key: permission "Sending access", restricted to that domain. Copy it once; it is the value of `RESEND_API_KEY`.
6. Pick the sender address on that domain; it is `SIGN_MONTH_REVIEW_FROM` (format `Stellaeum <review@your-domain>`). The recipient defaults to `stella3um@gmail.com`.
7. Generate a long random string for `SIGN_MONTH_VETO_SECRET` (for example `openssl rand -hex 32`). It signs the Reject links; rotating it invalidates links already emailed.

## 3. Environment variables (names only)

Set these in the Vercel project, **Production environment only** unless stated.

| Name | Where | Secret | Notes |
|---|---|---|---|
| `RESEND_API_KEY` | Vercel, Production only | yes | step 2 |
| `SIGN_MONTH_VETO_SECRET` | Vercel, Production only | yes | step 2 |
| `SIGN_MONTH_REVIEW_FROM` | Vercel, Production only | no | address on the verified domain |
| `SIGN_MONTH_REVIEW_TO` | Vercel, Production only | no | optional; defaults to `stella3um@gmail.com` |
| `NEXT_PUBLIC_APP_URL` | Vercel, Production | no | must be the real production URL: the Reject links are built from it |
| `CRON_SECRET` | Vercel, Production | yes | already exists; the crons and the manual run below use it |
| `GEMINI_API_KEY` | Vercel, Production | yes | already exists |
| `FF_DNES_V2_SERVER` | Vercel; Production when you flip it (step 5) | no | leave unset or `false` until then. May be `true` in Preview to test |
| `EXPO_PUBLIC_FF_DNES_V2` | EAS environment variables, per build profile (step 5) | no | bundle-time; `preview` profile first, `production` last |

Never put the secrets in Preview or Development environments: a preview deployment would then be able to send mail and sign links. After adding or changing a Vercel variable, **redeploy** the production deployment; running deployments keep the values they were built with.

## 4. Push and merge order (`ui-parity` to `main`)

`main` deploys to production on push and `ui-parity` is never merged without your say, so:

1. `git fetch`, then merge `main` into `ui-parity` (do this daily anyway). Resolve conflicts, rerun `pnpm run check:all`.
2. Push `ui-parity`. CI runs and Vercel makes a **preview** deployment. Smoke-test the preview: sign in, Днес on web still renders (flags are off), `GET /api/sign-month?...` answers.
3. Check the diff once more for anything you do not want in production (the two cron schedules in `apps/web/vercel.json` go live on merge; see the note below).
4. Merge `ui-parity` into `main` (a PR, so CI and the review are on record). Merging deploys production.
5. After the deploy: let the post-deploy smoke workflow run (`.github/workflows/smoke.yml`) and read it. `/api/cron/sign-month?probe=1` reports "skipped, table missing" until step 1 is done; that is a warning, not a failure.
6. Run step 1 (migration) now if it was not done yet; re-run the probe: it should now report `phase`, `pending`, `published`, `rejected` counts of 0.

Note on the cron: it is in `vercel.json` on the 24th-26th (generate and email) and the 1st-3rd (publish). Without the Resend variables the email cannot be sent and **nothing is published** (users see the evergreen texts), plus one Sentry warning per run. So the first run is safe even if step 2 is not finished, but you will not see any new monthly text until it is.

## 5. Flags: which first, what to check, how to roll back

**Order: `FF_DNES_V2_SERVER` first, `EXPO_PUBLIC_FF_DNES_V2` second.** The new mobile screen needs the new 3-part horoscope from the server; with the server flag off it would find old-format text it cannot split. The server flag alone is harmless to the old screens: it only changes the prompt for newly generated readings and answers `?upgrade=1` (which only the new mobile screen sends).

### 5a. Server flag

1. Vercel, Production: `FF_DNES_V2_SERVER=true`; redeploy production.
2. Check:
   - Your own Днес on the **old** mobile build and on web: today's reading still shows (a new reading is three short paragraphs; the old screens show paragraphs as text).
   - The daily cron (`/api/cron/daily-horoscope`) in the Vercel logs: no `AI_OUTPUT_INVALID` spike, no "serving a reading that is valid but short" flood (a few are normal).
   - Sentry: no new horoscope errors in the next hour.
   - Open one brand-new test account's Днес: a three-paragraph reading appears without numbers.
3. Roll back: set `FF_DNES_V2_SERVER` to `false` (or delete it) and redeploy production. The old prompt comes back byte-for-byte. Rows already written in the new format stay as they are and read fine on the old screens.

### 5b. Mobile flag

1. EAS: set `EXPO_PUBLIC_FF_DNES_V2=true` for the **preview** profile only; build the APK (`eas build --profile preview --platform android`); install it on a real phone; do the device checklist below.
2. Only when that passes: set it for the **production** profile, build, submit.
3. Check after release: Днес opens on the new screen, the horoscope is three levels, the four swipe pages work, «Питай Оракула» opens the Oracle, crystal collect works for a free user, Sentry is quiet.
4. Roll back: the flag is baked into the bundle and the app has no over-the-air update channel (`expo-updates` is not installed), so **rollback is a new build with the flag off**, which takes a store cycle. That is why it goes last and goes through the preview APK first. Server-side, nothing needs to change: the old screen understands both reading formats.

## 6. On a real Android phone, before the mobile flag goes on

Everything so far was verified on the emulator only. On a physical phone, with the `preview` APK:

- [ ] Layout at the phone's own size and, if you have a second phone, a small one (nothing clips, the Oracle exit sits 14px above the tab bar, the tab bar is untouched).
- [ ] Three-button navigation (bottom inset about 48): the horoscope levels may scroll inside their slot; nothing is cut, the exit stays put.
- [ ] System font size at the largest setting: text grows at most 1.2x and nothing overlaps (register A11Y-FONT-SCALE-CAP-DNES).
- [ ] Spectral font renders (Bulgarian letters, no fallback font), no italics anywhere.
- [ ] The starfield keeps clear of words: no star next to text, on all four swipe pages, and the swipe stays smooth (the zone code re-measures text a few times after layout; watch for dropped frames on a low-end phone).
- [ ] Swipe between the four pages; the dots follow; tapping a dot jumps.
- [ ] «Повече» opens the moon detail; «Събери» collects the crystal once and then shows «Събрано»; collecting twice does nothing; a free account can collect.
- [ ] The monthly page shows a text (generated or the evergreen one) and its title names the right sign and month.
- [ ] «Луна · прибл.» appears for an account with unknown birth time on a day the Moon changes sign.
- [ ] Airplane mode: the loading line then the single AI-unavailable message, no crash, no blank screen.
- [ ] Device time zone not Sofia: the date and "today" follow Europe/Sofia, not the phone.
- [ ] OLED black level: the base colour does not smear when scrolling (register BASE-COLOUR-HALATION).
- [ ] No keyboard or dev overlays; the RevenueCat dev toast is a development-build artefact and should not appear in the preview/production build (if it does, tell me).
- [ ] Back and forth between tabs: Днес, Карта, Ритъм keep their own backgrounds (the star clearing applies on Днес only).
- [ ] Sign out and in again: the greeting uses the first name, the horoscope reloads.

## 7. First monthly cycle (after step 5 or independently of it)

1. Around the 24th the cron generates next month's 12 texts (pro model first, flash if pro is down, the Bulgarian editor pass on both) and emails them. To rehearse earlier: `curl -H "Authorization: Bearer $CRON_SECRET" "https://<prod>/api/cron/sign-month?phase=generate&month=YYYY-MM"` (it writes pending rows and sends the real email).
2. Open one Reject link: it must show a confirm page and change nothing; press the button and check the row became `rejected` and that sign now shows its evergreen text.
3. Do nothing on the rest: on the 1st-3rd they become `published`.
4. Sentry: at most one event per problem per run (a model outage, a missing migration, a missing email setup, failed signs).
