import type { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ConnectInviteAcceptance } from '@/components/circle/ConnectInviteAcceptance'
import {
  getChartById,
  getConnectionInviteByTokenHash,
  getSpaceById,
  listSpaceMembers,
} from '@/lib/circle/service'
import { hashInviteToken } from '@/lib/circle/token'

export const metadata: Metadata = {
  title: 'Присъедини се към Кръг',
  description: 'Приеми покана за shared connection space в Stellaeum.',
}

export default async function ConnectInvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { userId } = await auth()

  if (!userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(`/connect/${token}`)}`)
  }

  const invite = await getConnectionInviteByTokenHash(hashInviteToken(token))
  if (!invite) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-[30px] border border-slate-200/10 bg-slate-950/35 p-8">
          <p className="font-cinzel text-[10px] uppercase tracking-[0.34em] text-slate-400">
            Поканата не е активна
          </p>
          <h1 className="mt-4 font-display text-[2rem] font-light text-white">
            Тази покана е изтекла или е била отменена.
          </h1>
          <p className="mt-5 text-sm leading-8 text-slate-300">
            Помоли човека да ти изпрати нов линк от Кръг.
          </p>
        </div>
      </div>
    )
  }

  const [inviterChart, existingSpace] = await Promise.all([
    getChartById(invite.inviter_chart_id),
    invite.space_id ? getSpaceById(invite.space_id) : Promise.resolve(null),
  ])
  const inviterName = inviterChart?.name ?? 'Твоят човек'
  const members = invite.space_id ? await listSpaceMembers(invite.space_id) : []

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <ConnectInviteAcceptance
        token={token}
        inviterName={inviterName}
        label={invite.invite_label || existingSpace?.label || null}
        relationshipType={invite.relationship_type}
        memberCount={members.length}
      />
    </div>
  )
}
