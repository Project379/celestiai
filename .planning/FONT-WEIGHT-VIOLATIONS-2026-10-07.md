---
title: Font-weight violations for the UI parity pass
created: 2026-10-07
status: LIST ONLY. Produced by the new lint rule `stellaeum/no-font-weight` (packages/config/eslint/no-font-weight.cjs, severity warn). Not fixed yet.
---

# Rule
Spectral weights are selected only through the per-weight family tokens (`font.body` Regular, `font.bodyMedium` Medium, `font.display` SemiBold, `font.displayStrong` Bold). `fontWeight` and NativeWind weight classes (`font-semibold`, `font-bold`, …) cannot switch static font files on React Native (Android fakes bold on the one file; iOS may ignore it).

# Existing violations (mobile, 2026-10-07)
Total / kinds / files: `341 {'class': 341} 55` — **341 weight-class uses, 0 `fontWeight` properties, in 55 files.** Count per file:

| Count | File |
|---|---|
| 27 | `apps/mobile/components/chart/AstrologyReference.tsx` |
| 19 | `apps/mobile/app/(authed)/(tabs)/circle.tsx` |
| 15 | `apps/mobile/components/horoscope/TransitOverviewCard.tsx` |
| 14 | `apps/mobile/app/(authed)/you/premium.tsx` |
| 14 | `apps/mobile/components/dashboard/LunarPhaseCard.tsx` |
| 12 | `apps/mobile/components/stories/RecommendationCard.tsx` |
| 11 | `apps/mobile/components/crystals/DailyStreakPanel.tsx` |
| 11 | `apps/mobile/components/stories/StoriesContent.tsx` |
| 10 | `apps/mobile/app/(authed)/wizard/location.tsx` |
| 10 | `apps/mobile/app/(authed)/wizard/time.tsx` |
| 10 | `apps/mobile/components/crystals/CrystalDetailPanel.tsx` |
| 9 | `apps/mobile/app/(authed)/(tabs)/rhythm.tsx` |
| 9 | `apps/mobile/components/astrology-guide/GuideLunarPhasesSection.tsx` |
| 8 | `apps/mobile/app/(authed)/wizard/confirm.tsx` |
| 8 | `apps/mobile/app/(authed)/you/settings-email.tsx` |
| 8 | `apps/mobile/components/circle/ConnectionSpaceDetailPanel.tsx` |
| 8 | `apps/mobile/components/crystals/CrystalOfTheDayCard.tsx` |
| 7 | `apps/mobile/app/(authed)/oracle.tsx` |
| 7 | `apps/mobile/app/(authed)/wizard/date.tsx` |
| 7 | `apps/mobile/components/circle/SavedProfileForm.tsx` |
| 6 | `apps/mobile/components/astrology-guide/GuideTransitsSection.tsx` |
| 6 | `apps/mobile/components/chart/HousesList.tsx` |
| 6 | `apps/mobile/components/chart/NatalWheelLegend.tsx` |
| 6 | `apps/mobile/components/chart/PlanetDetail.tsx` |
| 6 | `apps/mobile/components/circle/SavedProfileDetailPanel.tsx` |
| 5 | `apps/mobile/components/chart/AspectsList.tsx` |
| 5 | `apps/mobile/components/manifest/ManifestHistory.tsx` |
| 4 | `apps/mobile/app/(authed)/you/guide.tsx` |
| 4 | `apps/mobile/app/(public)/sign-in.tsx` |
| 4 | `apps/mobile/app/(public)/sign-up.tsx` |
| 4 | `apps/mobile/app/(public)/two-factor.tsx` |
| 4 | `apps/mobile/app/(public)/verify.tsx` |
| 4 | `apps/mobile/components/wizard/CitySearch.tsx` |
| 3 | `apps/mobile/app/(authed)/circle/new-connection.tsx` |
| 3 | `apps/mobile/app/(authed)/you/crystals.tsx` |
| 3 | `apps/mobile/app/(authed)/you/settings.tsx` |
| 3 | `apps/mobile/components/CrystalCard.tsx` |
| 3 | `apps/mobile/components/astrology-guide/GuideAspectsSection.tsx` |
| 3 | `apps/mobile/components/astrology-guide/GuideHistorySection.tsx` |
| 3 | `apps/mobile/components/astrology-guide/GuidePlanetsSection.tsx` |
| 3 | `apps/mobile/components/astrology-guide/GuideSection.tsx` |
| 3 | `apps/mobile/components/crystals/CrystalCollectionContent.tsx` |
| 3 | `apps/mobile/components/crystals/CrystalGridTile.tsx` |
| 3 | `apps/mobile/components/tier/PremiumLock.tsx` |
| 2 | `apps/mobile/app/(authed)/(tabs)/you.tsx` |
| 2 | `apps/mobile/app/(authed)/circle/new.tsx` |
| 2 | `apps/mobile/app/(authed)/you/settings-name.tsx` |
| 2 | `apps/mobile/app/(authed)/you/settings-password.tsx` |
| 2 | `apps/mobile/components/astrology-guide/GuideMethodSection.tsx` |
| 2 | `apps/mobile/components/astrology-guide/GuidePrinciplesSection.tsx` |
| 2 | `apps/mobile/components/oracle/ReadingBody.tsx` |
| 2 | `apps/mobile/components/settings/DeletionPendingBanner.tsx` |
| 2 | `apps/mobile/components/wizard/TimePicker.tsx` |
| 1 | `apps/mobile/components/oracle/TopicCards.tsx` |
| 1 | `apps/mobile/components/settings/PushNotificationToggle.tsx` |

# How to fix (per screen, during the parity pass)
Replace the weight class with the matching token in an inline style (or a shared `Text` primitive): `font-medium` → `font.bodyMedium`, `font-semibold` → `font.display`, `font-bold` → `font.displayStrong`; `font-normal` → delete. Re-run `pnpm --filter @stellaeum/mobile lint` and watch the `stellaeum/no-font-weight` count fall to 0, then raise the rule to `error`.

Web is not covered by this rule: the web build serves all four weights as separate faces, so weight utilities work there.
