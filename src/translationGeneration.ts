import { getPluralKey } from './compile-to-string'

function resolveSelect(
  value: string | number | undefined | null,
  options: Record<string, string | (() => string)>
): string {
  const v = value == null ? 'other' : String(value)
  const handler = options[v] ?? options['other']

  if (handler == null) return ''
  return typeof handler === 'function' ? handler() : handler
}

function resolvePlural(
  value: number,
  options: Record<string, string | (() => string)>
): string {
  const key = getPluralKey(value)
  const handler = options[key] ?? options['other']
  if (handler == null) return ''
  return typeof handler === 'function' ? handler() : handler
}

export const TranslationGen = {
  resolveSelect,
  resolvePlural,
}
