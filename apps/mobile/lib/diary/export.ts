import { Share } from 'react-native'

export async function shareDiaryExport(
  apiFetchRaw: (path: string) => Promise<Response>,
  format: 'markdown' | 'json',
) {
  const response = await apiFetchRaw(`/api/diary/v2/export?format=${format}`)
  const message = await response.text()
  await Share.share({
    title: format === 'markdown' ? 'Дневник · Markdown' : 'Дневник · JSON',
    message,
  })
}
