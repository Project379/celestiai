# Phase 2: Authentication - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can securely create accounts, log in, and maintain persistent sessions via Clerk. Includes email verification, password reset, logout, and protected route handling. All auth flows use Bulgarian language UI with the cosmic glassmorphism theme.

</domain>

<decisions>
## Implementation Decisions

### Auth UI Flow
- Full-page auth experience (dedicated routes, not modals)
- Combined sign-in/sign-up on single `/auth` page with tabs
- Full cosmic theme with stars animation and constellation graphics alongside form
- Celestia logo with Bulgarian tagline above form
- Inline validation feedback under each field

### Error Handling
- Generic error messages for credentials ("Invalid email or password") — security over specificity
- Simple rate limit message ("Too many attempts. Please wait and try again.") — no countdown timer
- Unverified email: block sign-in with resend verification option on same screen
- Warm and helpful Bulgarian error tone ("Нещо не е наред. Моля, опитайте отново.")

### Session Behavior
- 7-day session duration as default
- "Remember me" checkbox: checked = 30 days, unchecked = session-only
- Session expiry: soft prompt modal ("Your session expired. Sign in to continue.") — preserves page context
- After sign-in: always redirect to dashboard/home (not return-to-original)

### Protected Route UX
- Unauthenticated access: show teaser with overlay CTA ("Sign in to view your chart")
- Loading state: full-page cosmic spinner while checking auth status
- Logout confirmation dialog before signing out
- Logout button in user menu dropdown (avatar/icon in header)

### Claude's Discretion
- Exact cosmic animation implementation for auth pages
- Spinner/loader design details
- Specific Bulgarian text for all UI copy (following warm tone guideline)
- Form field ordering and spacing

</decisions>

<specifics>
## Specific Ideas

- Auth pages should feel immersive — stars background matching the app's cosmic theme
- The teaser + CTA pattern for protected routes gives users a glimpse of value before requiring sign-in
- Warm Bulgarian tone: supportive, not clinical or robotic

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-authentication*
*Context gathered: 2026-01-22*
