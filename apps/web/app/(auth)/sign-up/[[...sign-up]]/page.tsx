import { SignUp } from '@clerk/nextjs'
import { AuthBackground } from '../../../../components/auth/AuthBackground'
import { AuthHeader } from '../../../../components/auth/AuthHeader'

const clerkAppearance = {
  elements: {
    rootBox: 'w-full',
    card: 'bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-purple-500/10',
    headerTitle: 'text-slate-100',
    headerSubtitle: 'text-slate-400',
    socialButtonsBlockButton:
      'bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 text-slate-200',
    socialButtonsBlockButtonText: 'text-slate-200',
    dividerLine: 'bg-slate-700',
    dividerText: 'text-slate-500',
    formFieldLabel: 'text-slate-300',
    formFieldInput:
      'bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20',
    formButtonPrimary:
      'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25',
    footerActionLink: 'text-purple-400 hover:text-purple-300',
    identityPreviewEditButton: 'text-purple-400 hover:text-purple-300',
    formResendCodeLink: 'text-purple-400 hover:text-purple-300',
    alert: 'bg-red-900/50 border-red-700 text-red-200',
    alertText: 'text-red-200',
  },
}

export default function SignUpPage() {
  return (
    <>
      <AuthBackground />

      <div className="relative z-10 w-full max-w-md">
        <AuthHeader />

        <SignUp
          appearance={clerkAppearance}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
        />
      </div>
    </>
  )
}
