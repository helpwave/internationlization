export type DiagnosticLevel = 'warning' | 'error'

export type DiagnosticReporter = (level: DiagnosticLevel, message: string) => void

export type NumericKind = 'int' | 'float'

export interface ResolvedPlaceholderType {
  typing: string,
  numeric?: NumericKind,
}

const SUPPORTED_TYPES = ['string', 'int', 'float'] as const

type SupportedType = typeof SUPPORTED_TYPES[number]

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
    report('warning', `Placeholder [${variableName}] of [${context.key}] in file ${context.filePath} has no type. Interpreting it as string.`)
    return { typing: 'string' }
  }

  if (!isSupportedType(typing)) {
    report('error', `Type "${typing}" for ${location} is not supported. Only string, int, and float are supported.`)
    return { typing: 'string' }
  }

  return toFunctionType(typing)
}
