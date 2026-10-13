import fs from 'fs'
import path from 'path'
import type { IntlConfig } from './intl-config'
import {
  resolvePlaceholderType,
  type DiagnosticLevel,
  type DiagnosticReporter,
  type NumericKind
} from './placeholder-type'

export interface IntlDiagnostic {
  level: DiagnosticLevel,
  message: string,
}

export interface FuncParam {
  name: string,
  typing: string,
  numeric?: NumericKind,
}

export type TranslationEntry =
  { type: 'text', value: string }
  | { type: 'func', params: FuncParam[], value: string }

export type LocaleCatalog = Record<string, Record<string, TranslationEntry>>

export interface CollectedTranslations {
  catalog: LocaleCatalog,
  diagnostics: IntlDiagnostic[],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isPrefix(value: string): boolean {
  return value.split('.').every(part => /^[A-Za-z_][A-Za-z0-9_]*$/.test(part))
}

export function describeTranslationEntry(entry: TranslationEntry): string {
  if (entry.type === 'text') return 'string'
  const params = entry.params.map(param => `${param.name}: ${param.typing}`).join(', ')
  return `(${params}) => string`
}

function collectArbPaths(locations: readonly string[], diagnostics: IntlDiagnostic[]): string[] {
  const files: string[] = []
  const seenFiles = new Set<string>()
  const seenDirectories = new Set<string>()

  const addFile = (filePath: string): void => {
    try {
      const real = fs.realpathSync(filePath)
      if (seenFiles.has(real)) return
      seenFiles.add(real)
      files.push(real)
    } catch (error) {
      diagnostics.push({
        level: 'error',
        message: `Failed to read ${filePath}: ${errorMessage(error)}`,
      })
    }
  }

  const walk = (directory: string): void => {
    let realDirectory = directory
    try {
      realDirectory = fs.realpathSync(directory)
    } catch (error) {
      diagnostics.push({
        level: 'error',
        message: `Failed to read ${directory}: ${errorMessage(error)}`,
      })
      return
    }
    if (seenDirectories.has(realDirectory)) return
    seenDirectories.add(realDirectory)

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(realDirectory, { withFileTypes: true })
    } catch (error) {
      diagnostics.push({
        level: 'error',
        message: `Failed to read ${directory}: ${errorMessage(error)}`,
      })
      return
    }

    for (const entry of entries) {
      const fullPath = path.join(realDirectory, entry.name)
      let stat: fs.Stats
      try {
        stat = fs.statSync(fullPath)
      } catch (error) {
        diagnostics.push({
          level: 'error',
          message: `Failed to read ${fullPath}: ${errorMessage(error)}`,
        })
        continue
      }
      if (stat.isDirectory()) {
        walk(fullPath)
      } else if (stat.isFile() && entry.name.endsWith('.arb')) {
        addFile(fullPath)
      }
    }
  }

  for (const location of locations) {
    const resolved = path.resolve(location)
    if (!fs.existsSync(resolved)) {
      diagnostics.push({
        level: 'error',
        message: `Path does not exist: ${location}`,
      })
      continue
    }

    const stat = fs.statSync(resolved)
    if (stat.isDirectory()) {
      walk(resolved)
    } else if (stat.isFile()) {
      if (!resolved.endsWith('.arb')) {
        diagnostics.push({
          level: 'error',
          message: `Expected an .arb file: ${location}`,
        })
        continue
      }
      addFile(resolved)
    } else {
      diagnostics.push({
        level: 'error',
        message: `Unsupported path: ${location}`,
      })
    }
  }

  files.sort((left, right) => left.localeCompare(right))
  return files
}

function readArbObject(filePath: string, diagnostics: IntlDiagnostic[]): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    if (!isRecord(parsed)) {
      diagnostics.push({
        level: 'error',
        message: `File ${filePath} must contain a JSON object.`,
      })
      return undefined
    }
    return parsed
  } catch (error) {
    diagnostics.push({
      level: 'error',
      message: `Failed to read ${filePath}: ${errorMessage(error)}`,
    })
    return undefined
  }
}

function buildEntry(
  key: string,
  value: string,
  meta: unknown,
  filePath: string,
  diagnostics: IntlDiagnostic[]
): TranslationEntry | undefined {
  const report: DiagnosticReporter = (level, message) => {
    diagnostics.push({ level, message })
  }

  if (meta !== undefined && !isRecord(meta)) {
    diagnostics.push({
      level: 'error',
      message: `Metadata for "${key}" in ${filePath} must be an object.`,
    })
    return undefined
  }

  if (meta === undefined || meta.placeholders === undefined) {
    return { type: 'text', value }
  }

  if (!isRecord(meta.placeholders)) {
    diagnostics.push({
      level: 'error',
      message: `Placeholders for "${key}" in ${filePath} must be an object.`,
    })
    return undefined
  }

  const params: FuncParam[] = []
  for (const [name, definition] of Object.entries(meta.placeholders)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      diagnostics.push({
        level: 'error',
        message: `Placeholder "${name}" of "${key}" in ${filePath} is not a valid identifier.`,
      })
      return undefined
    }

    if (definition !== undefined && !isRecord(definition)) {
      diagnostics.push({
        level: 'warning',
        message: `Placeholder "${name}" of "${key}" in ${filePath} must be an object. Interpreting its type as string.`,
      })
      params.push({ name, typing: 'string' })
      continue
    }

    if (isRecord(definition) && definition.type !== undefined && typeof definition.type !== 'string') {
      diagnostics.push({
        level: 'warning',
        message: `Type of placeholder "${name}" of "${key}" in ${filePath} must be a string. Interpreting it as string.`,
      })
      params.push({ name, typing: 'string' })
      continue
    }

    const rawType = isRecord(definition) && typeof definition.type === 'string'
      ? definition.type
      : undefined

    params.push({
      name,
      ...resolvePlaceholderType(rawType, name, report, { key, filePath }),
    })
  }

  return { type: 'func', params, value }
}

function readTranslationFile(
  filePath: string,
  config: Pick<IntlConfig, 'supportedLocales'>,
  catalog: LocaleCatalog,
  diagnostics: IntlDiagnostic[]
): void {
  const content = readArbObject(filePath, diagnostics)
  if (!content) return

  const localeValue = content['@@locale']
  if (typeof localeValue !== 'string' || localeValue.length === 0) {
    diagnostics.push({
      level: 'error',
      message: `File ${filePath} must set @@locale to one of: ${config.supportedLocales.join(', ')}.`,
    })
    return
  }
  if (!config.supportedLocales.includes(localeValue)) {
    diagnostics.push({
      level: 'error',
      message: `Locale "${localeValue}" in ${filePath} is not listed in supportedLocales.`,
    })
    return
  }

  let prefix = ''
  if (Object.prototype.hasOwnProperty.call(content, '@@prefix')) {
    const prefixValue = content['@@prefix']
    if (typeof prefixValue !== 'string' || !isPrefix(prefixValue)) {
      diagnostics.push({
        level: 'error',
        message: `File ${filePath} has an invalid @@prefix. Use a dotted identifier such as "test" or "time.relative".`,
      })
      return
    }
    prefix = prefixValue
  }

  if (!catalog[localeValue]) catalog[localeValue] = {}

  for (const [key, value] of Object.entries(content)) {
    if (key.startsWith('@')) continue
    if (typeof value !== 'string') {
      diagnostics.push({
        level: 'error',
        message: `Key "${key}" in ${filePath} must be a string.`,
      })
      continue
    }

    const flatKey = prefix ? `${prefix}.${key}` : key
    if (catalog[localeValue][flatKey]) {
      diagnostics.push({
        level: 'warning',
        message: `Key "${flatKey}" for locale "${localeValue}" is defined more than once. The definition in ${filePath} was ignored.`,
      })
      continue
    }

    const entry = buildEntry(key, value, content[`@${key}`], filePath, diagnostics)
    if (entry) catalog[localeValue][flatKey] = entry
  }
}

function flagInconsistencies(
  catalog: LocaleCatalog,
  supportedLocales: readonly string[],
  diagnostics: IntlDiagnostic[]
): void {
  const presentLocales = supportedLocales.filter(locale => catalog[locale] !== undefined)

  for (const locale of supportedLocales) {
    if (catalog[locale] === undefined) {
      diagnostics.push({
        level: 'warning',
        message: `Supported locale "${locale}" has no .arb file.`,
      })
    }
  }

  const keys = new Set<string>()
  for (const locale of presentLocales) {
    for (const key of Object.keys(catalog[locale])) keys.add(key)
  }

  for (const key of [...keys].sort((left, right) => left.localeCompare(right))) {
    const defined = presentLocales.filter(locale => catalog[locale][key] !== undefined)
    const missing = presentLocales.filter(locale => catalog[locale][key] === undefined)
    if (missing.length > 0) {
      diagnostics.push({
        level: 'warning',
        message: `Key "${key}" is missing for ${missing.map(locale => `"${locale}"`).join(', ')}. It is defined for ${defined.map(locale => `"${locale}"`).join(', ')}.`,
      })
    }

    const baseLocale = defined[0]
    const baseSignature = describeTranslationEntry(catalog[baseLocale][key])
    for (const locale of defined.slice(1)) {
      const signature = describeTranslationEntry(catalog[locale][key])
      if (signature === baseSignature) continue
      diagnostics.push({
        level: 'warning',
        message: `Key "${key}" has inconsistent typing. "${baseLocale}" is ${baseSignature}, "${locale}" is ${signature}.`,
      })
    }
  }
}

export function collectTranslations(
  locations: readonly string[],
  config: Pick<IntlConfig, 'supportedLocales'>
): CollectedTranslations {
  const diagnostics: IntlDiagnostic[] = []
  const catalog: LocaleCatalog = {}

  if (locations.length === 0) {
    diagnostics.push({
      level: 'error',
      message: 'Provide at least one .arb file or directory.',
    })
    return { catalog, diagnostics }
  }

  const files = collectArbPaths(locations, diagnostics)
  if (files.length === 0 && !diagnostics.some(item => item.level === 'error')) {
    diagnostics.push({
      level: 'error',
      message: 'No .arb files were found in the given paths.',
    })
  }

  for (const filePath of files) {
    readTranslationFile(filePath, config, catalog, diagnostics)
  }

  flagInconsistencies(catalog, config.supportedLocales, diagnostics)

  return { catalog, diagnostics }
}
