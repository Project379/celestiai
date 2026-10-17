import AsyncStorage from '@react-native-async-storage/async-storage'
import type { CreateDiaryEntryV2Input, UpdateDiaryEntryV2Input } from '@stellaeum/core/diary/v2'

export type MobilePendingDiaryMutation =
  | { key: string; operation: 'create'; entryId: string; payload: CreateDiaryEntryV2Input; queuedAt: string }
  | { key: string; operation: 'update'; entryId: string; payload: UpdateDiaryEntryV2Input; queuedAt: string }
  | { key: string; operation: 'delete'; entryId: string; revision: number; queuedAt: string }

const queueKey = (userId: string) => `stellaeum.diary.pending.v2.${userId}`
export const composerKey = (userId: string, mode: string) => `stellaeum.diary.composer.v2.${userId}.${mode}`

export async function readDiaryQueue(userId: string): Promise<MobilePendingDiaryMutation[]> {
  try { return JSON.parse(await AsyncStorage.getItem(queueKey(userId)) ?? '[]') as MobilePendingDiaryMutation[] }
  catch { return [] }
}

export async function writeDiaryQueue(userId: string, queue: MobilePendingDiaryMutation[]) {
  if (queue.length) await AsyncStorage.setItem(queueKey(userId), JSON.stringify(queue))
  else await AsyncStorage.removeItem(queueKey(userId))
}

export async function enqueueDiaryMutation(userId: string, mutation: MobilePendingDiaryMutation) {
  const queue = await readDiaryQueue(userId)
  const createIndex = queue.findIndex((item) => item.entryId === mutation.entryId && item.operation === 'create')
  if (createIndex >= 0 && mutation.operation === 'update') {
    const create = queue[createIndex] as Extract<MobilePendingDiaryMutation, { operation: 'create' }>
    queue[createIndex] = { ...create, payload: { ...create.payload, ...mutation.payload } as CreateDiaryEntryV2Input, queuedAt: mutation.queuedAt }
  } else if (createIndex >= 0 && mutation.operation === 'delete') {
    queue.splice(createIndex, 1)
  } else {
    const previous = queue.findIndex((item) => item.entryId === mutation.entryId && item.operation === mutation.operation)
    if (previous >= 0) queue[previous] = mutation
    else queue.push(mutation)
  }
  await writeDiaryQueue(userId, queue)
}

export async function clearDiaryStorage(userId: string) {
  const keys = await AsyncStorage.getAllKeys()
  const prefix = `stellaeum.diary.`
  await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(prefix) && key.includes(`.${userId}`)))
}

export async function removeComposerDraft(userId: string, kind: string, entryId: string) {
  const key = composerKey(userId, kind)
  const stored = await AsyncStorage.getItem(key)
  if (!stored) return
  try {
    const parsed = JSON.parse(stored)
    if ((parsed.draft ?? parsed).id === entryId) await AsyncStorage.removeItem(key)
  } catch { /* An unreadable draft is retained for recovery. */ }
}
