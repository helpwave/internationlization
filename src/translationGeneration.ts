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
  const v = String(value)
  const handler = options[v] ?? options['other']
  if (handler == null) return ''
  return typeof handler === 'function' ? handler() : handler
}

export const TranslationGen = {
  resolveSelect,
  resolvePlural,
}
