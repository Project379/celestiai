/**
 * stellaeum/no-font-weight — Spectral weights are selected ONLY through the
 * per-weight family tokens (`font.body`, `font.bodyMedium`, `font.display`,
 * `font.displayStrong` in apps/mobile/components/design-system/tokens.ts).
 *
 * Why: the app ships four STATIC Spectral files (founder decision 2026-10-07).
 * React Native cannot switch static files with `fontWeight` or NativeWind's
 * `font-bold` family of classes: on Android it fakes bold on the one file, on iOS
 * it may ignore it. A weight must be a different `fontFamily`.
 *
 * Flags (warn, so the existing violations can be fixed per screen during the UI
 * parity pass without breaking lint):
 *   - an object property named `fontWeight` (inline styles, StyleSheet, tokens);
 *   - a Tailwind/NativeWind weight class (`font-thin` … `font-black`) inside a
 *     string or template literal.
 * Rule id is its own (`stellaeum/no-font-weight`), so check:bg-lint-baseline,
 * which counts only `no-restricted-syntax`, is unaffected.
 */
const WEIGHT_CLASS = /(^|[\s"'`:])font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)(?![\w-])/

const MSG_PROP =
  'Do not set fontWeight — static Spectral files cannot be switched by weight on React Native. Use a per-weight family token (font.body / font.bodyMedium / font.display / font.displayStrong).'
const MSG_CLASS =
  'Do not use a font-weight class — NativeWind cannot switch static font files by weight. Use a per-weight family token (font.body / font.bodyMedium / font.display / font.displayStrong).'

const rule = {
  meta: { type: 'problem', schema: [] },
  create(context) {
    return {
      Property(node) {
        const k = node.key
        const name = k.type === 'Identifier' ? k.name : k.type === 'Literal' ? String(k.value) : null
        if (name === 'fontWeight') context.report({ node, message: MSG_PROP })
      },
      Literal(node) {
        if (typeof node.value === 'string' && WEIGHT_CLASS.test(node.value) && node.parent.type !== 'Property') {
          context.report({ node, message: MSG_CLASS })
        } else if (typeof node.value === 'string' && WEIGHT_CLASS.test(node.value) && node.parent.type === 'Property' && node.parent.value === node) {
          context.report({ node, message: MSG_CLASS })
        }
      },
      TemplateElement(node) {
        if (WEIGHT_CLASS.test(node.value.raw)) context.report({ node, message: MSG_CLASS })
      },
      JSXText() {},
    }
  },
}

module.exports = { plugin: { rules: { 'no-font-weight': rule } }, RULE: { 'stellaeum/no-font-weight': 'warn' } }
