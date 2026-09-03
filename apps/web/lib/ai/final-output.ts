const META_TAIL = /(?:\\?\*{0,2}\s*)?(?:\\?\(\s*)?(?:wait\b|let(?:'|’)?s\b|let me\b|we need\b|i need\b|i should\b|need to\b|analysis\b|draft\b|construct carefully\b|final answer\b)/i

/**
 * Last defense against model self-talk accidentally appearing in final text.
 * This is deterministic and never makes a second model request.
 */
export function sanitizeFinalAIOutput(value: string): string {
  let text = value
    .trim()
    .replace(/^```(?:text|markdown)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const metaTailIndex = text.search(META_TAIL)
  if (metaTailIndex >= 0) {
    text = text.slice(0, metaTailIndex)
  }

  return text.replace(/[\\*_(\s]+$/, '').trim()
}
