export type DiagnosticLevel = 'warning' | 'error'

export type DiagnosticReporter = (level: DiagnosticLevel, message: string) => void

export type NumericKind = 'int' | 'float'

export interface ResolvedPlaceholderType {
  typing: string,
  numeric?: NumericKind,
}

const SUPPORTED_TYPES = ['string', 'int', 'float'] as const

type SupportedType = typeof SUPPORTED_TYPES[number]

const NAME_TYPE_HINTS: { type: SupportedType, names: string[] }[] = [
  { type: 'int', names: ['count', 'amount', 'length', 'number'] },
  { type: 'string', names: ['name'] },
]

function toFunctionType(typeName: SupportedType): ResolvedPlaceholderType {
  if (typeName === 'int') return { typing: 'number', numeric: 'int' }
  if (typeName === 'float') return { typing: 'number', numeric: 'float' }
  return { typing: 'string' }
}

function isSupportedType(typeName: string): typeName is SupportedType {
  return (SUPPORTED_TYPES as readonly string[]).includes(typeName)
}

export interface PlaceholderTypeContext {
  key: string,
  filePath: string,
}

export function resolvePlaceholderType(
  rawType: string | undefined,
  variableName: string,
  report: DiagnosticReporter,
  context: PlaceholderTypeContext
): ResolvedPlaceholderType {
  const location = `variable [${variableName}] of [${context.key}] in file ${context.filePath}`
  const typing = rawType?.trim() ?? ''

  if (!typing) {
    const hint = NAME_TYPE_HINTS.find(entry => entry.names.includes(variableName))
    if (hint) {
      const article = /^[aeiou]/i.test(hint.type) ? 'an' : 'a'
      report('warning', [
        `Variable [${variableName}] of [${context.key}] in file ${context.filePath}`,
        `was considered ${article} ${hint.type} because the name is one of ${hint.names.join(', ')}.`,
        'Set the type explicitly or rename it to avoid this warning.',
      ].join(' '))
      return toFunctionType(hint.type)
    }
    return { typing: 'string' }
  }

  if (!isSupportedType(typing)) {
    report('error', `Type "${typing}" for ${location} is not supported. Only string, int, and float are supported.`)
    return { typing: 'string' }
  }

  return toFunctionType(typing)
}
