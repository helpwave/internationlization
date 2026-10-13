import fs from 'fs'
import path from 'path'

export const COMPILE_TARGETS = ['typescript'] as const

export type CompileTarget = typeof COMPILE_TARGETS[number]

export const DEFAULT_SUPPORTED_LOCALES = ['en-US', 'de-DE']

export const DEFAULT_COMPILE_TARGET: CompileTarget = 'typescript'

export const DEFAULT_EXPORT_NAME = 'appTranslation'

export const DEFAULT_OUTPUT_FILE = './i18n/translations.ts'

export interface IntlConfig {
  supportedLocales: string[],
  compileTo: CompileTarget,
  name: string,
  outputFile: string,
  translationFiles: string[],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readLocaleList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error('Config field "supportedLocales" must be an array of strings.')
  }
  if (value.length === 0) {
    throw new Error('Config field "supportedLocales" must list at least one locale.')
  }

  const locales: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string' || !/^[A-Za-z0-9_-]+$/.test(entry)) {
      throw new Error(`Locale ${JSON.stringify(entry)} in supportedLocales may only contain letters, numbers, hyphens, and underscores.`)
    }
    locales.push(entry)
  }

  if (new Set(locales).size !== locales.length) {
    throw new Error('Config field "supportedLocales" contains duplicates.')
  }

  return locales
}

function readCompileTarget(value: unknown): CompileTarget {
  if (value === 'typescript') return 'typescript'
  throw new Error(`Config field "compileTo" must be "typescript". Received ${JSON.stringify(value)}.`)
}

function readStringSetting(value: unknown, field: string, fallback: string): string {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Config field "${field}" must be a non-empty string.`)
  }
  return value
}

function readTranslationFiles(value: unknown): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    throw new Error('Config field "translationFiles" must be an array of paths.')
  }

  const files: string[] = []
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      throw new Error('Config field "translationFiles" must contain non-empty path strings.')
    }
    files.push(entry)
  }
  return files
}

export function loadIntlConfig(configPath: string): IntlConfig {
  const resolved = path.resolve(configPath)
  if (!fs.existsSync(resolved)) {
    throw new Error(`Configuration file not found: ${configPath}`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(resolved, 'utf-8'))
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Configuration file is not valid JSON: ${configPath} (${reason})`)
  }

  if (!isRecord(parsed)) {
    throw new Error('Configuration file must contain a JSON object.')
  }

  return {
    supportedLocales: parsed.supportedLocales === undefined
      ? [...DEFAULT_SUPPORTED_LOCALES]
      : readLocaleList(parsed.supportedLocales),
    compileTo: parsed.compileTo === undefined
      ? DEFAULT_COMPILE_TARGET
      : readCompileTarget(parsed.compileTo),
    name: readStringSetting(parsed.name, 'name', DEFAULT_EXPORT_NAME),
    outputFile: readStringSetting(parsed.outputFile, 'outputFile', DEFAULT_OUTPUT_FILE),
    translationFiles: readTranslationFiles(parsed.translationFiles),
  }
}
