import { SignIn } from '@clerk/nextjs'
import type { Metadata } from 'next'
import { AuthHeader } from '@/components/auth/AuthHeader'
import { AuthFormWrapper } from '@/components/auth/AuthFormWrapper'

export const metadata: Metadata = {
  title: 'Вход',
  description: 'Влез в своя Celestia AI акаунт',
}

const clerkAppearance = {
  elements: {
    rootBox: 'w-full',
    card: 'bg-transparent shadow-none border-0',
    headerTitle: 'font-display text-slate-100 text-[1.5rem] font-semibold tracking-tight',
    headerSubtitle: 'font-display text-slate-400 text-[14px] italic',
    socialButtonsBlockButton:
      'rounded-full border border-white/[0.08] bg-white/[0.02] text-slate-200 font-display text-[13px] hover:border-violet-300/30 hover:bg-white/[0.04]',
    socialButtonsBlockButtonText: 'text-slate-200 font-display',
    dividerLine: 'bg-white/[0.06]',
    dividerText: 'font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500',
    formFieldLabel:
      'font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500',
    formFieldInput:
      'border-0 border-b border-white/[0.08] bg-transparent text-slate-100 placeholder:text-slate-600 font-display text-[15px] px-1 py-2.5 rounded-none focus:border-amber-300/60 focus:ring-0',
    formButtonPrimary:
      'group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-amber-300/50 bg-gradient-to-r from-violet-500/15 via-transparent to-amber-400/15 px-6 py-3 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-amber-100 transition-all hover:border-amber-300/80 hover:text-white hover:shadow-[0_0_28px_rgba(251,191,36,0.22)] normal-case shadow-none',
    footerActionLink:
      'font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-slate-400 hover:text-amber-300 transition-colors',
    identityPreviewEditButton: 'text-amber-300 hover:text-amber-200',
    formResendCodeLink: 'text-amber-300 hover:text-amber-200',
    alert: 'border-l border-rose-300/50 bg-rose-500/[0.04]',
    alertText: 'font-display text-[13px] italic text-rose-300/90',
  },
}

export default function SignInPage() {
  return (
    <div className="w-full max-w-md">
      <AuthHeader />

      <AuthFormWrapper>
        <SignIn
          appearance={clerkAppearance}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
        />
      </AuthFormWrapper>
    </div>
  )
}
