'use client'

import Link from 'next/link'
import { useUser } from '@clerk/nextjs'

export function UserMenu() {
  const { user, isLoaded } = useUser()
  return <Link href="/you" aria-label="Твоят профил" className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-1 ring-slate-200/15 hover:ring-amber-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
    {isLoaded && user?.imageUrl
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
      : <svg aria-hidden="true" className="h-5 w-5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></svg>}
  </Link>
}
