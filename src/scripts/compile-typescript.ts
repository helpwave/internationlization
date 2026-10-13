import { compileToCode } from '../compile-to-code'
import { ICUUtil } from '../icu'
import type { FuncParam, LocaleCatalog, TranslationEntry } from './collect-translations'
import type { IntlConfig } from './intl-config'

type GeneratedEntry =
  TranslationEntry
  | { type: 'nested', value: Record<string, GeneratedEntry> }

export interface CompileResult {
  source: string,
  errors: string[],
}

function capitalize(value: string): string {
  if (value.length === 0) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function quoteKey(key: string): string {
  const escaped = key
    .replace(/\\/g, '\\\\')
    .replace(/'/g, '\\\'')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
  return `'${escaped}'`
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function numericFormats(params: readonly FuncParam[]): Record<string, 'int' | 'float'> | undefined {
  const formats: Record<string, 'int' | 'float'> = {}
  for (const param of params) {
    if (param.numeric) formats[param.name] = param.numeric
  }
  if (Object.keys(formats).length === 0) return undefined
  return formats
}

function generateCode(
  obj: Record<string, GeneratedEntry>,
  errors: string[],
  indentLevel = 1
): string {
  const indent = '  '.repeat(indentLevel)
  const entries = Object.entries(obj).sort((left, right) => left[0].localeCompare(right[0]))
  let source = ''

  for (const [key, entry] of entries) {
    const quotedKey = quoteKey(key)
    const isLast = entries[entries.length - 1][0] === key
    const comma = isLast ? '' : ','

    try {
      if (entry.type === 'func') {
        const ast = ICUUtil.parse(ICUUtil.lex(entry.value))
        let compiled = compileToCode(ast, { numericFormats: numericFormats(entry.params) }).map((value, index, array) => {
          if (value.startsWith(' ')) return value
          if (index - 1 < 0 || !array[index - 1].startsWith(' ')) {
            return `_out += ${value}`
          }
          return value
        })
        if (compiled.filter(value => value.startsWith('_out +=')).length === 1) {
          const first = compiled.findIndex(value => value.startsWith('_out +='))
          compiled[first] = 'return ' + compiled[first].slice(8)
        } else {
          compiled = [
            'let _out: string = \'\'',
            ...compiled,
            'return _out',
          ]
        }
        const functionLines: string[] = [
          `({ ${entry.params.map(value => value.name).join(', ')} }): string => {`,
          ...compiled.map(value => `  ${value}`),
          '}',
        ]
        source += `${indent}${quotedKey}: ${functionLines.join(`\n${indent}`)}${comma}\n`
      } else if (entry.type === 'text') {
        const ast = ICUUtil.parse(ICUUtil.lex(entry.value))
        const compiled = compileToCode(ast, { isOnlyText: true })
        const text = compiled.length === 1 ? compiled[0] : `\`${entry.value}\``
        source += `${indent}${quotedKey}: ${text}${comma}\n`
      } else {
        source += `${indent}${quotedKey}: {\n`
        source += generateCode(entry.value, errors, indentLevel + 1)
        source += `${indent}}${comma}\n`
      }
    } catch (error) {
      const shown = entry.type === 'nested' ? key : entry.value
      errors.push(`Failed to compile key [${key}] with value "${shown}": ${errorMessage(error)}`)
    }
  }

  return source
}

function generateType(catalog: LocaleCatalog, locales: readonly string[]): string {
  const indent = '  '
  const fullObject: Record<string, TranslationEntry> = {}

  for (const locale of locales) {
    const localizedEntries = Object.entries(catalog[locale] ?? {}).sort((left, right) => {
      return left[0].localeCompare(right[0])
    })
    for (const [name, entry] of localizedEntries) {
      if (!fullObject[name]) fullObject[name] = entry
    }
  }

  let source = ''
  for (const [key, entry] of Object.entries(fullObject)) {
    const quotedKey = quoteKey(key)
    if (entry.type === 'func') {
      const params = entry.params.map(param => `${param.name}: ${param.typing}`).join(', ')
      source += `${indent}${quotedKey}: (values: { ${params} }) => string,\n`
    } else {
      source += `${indent}${quotedKey}: string,\n`
    }
  }

  return source
}

export function compileToTypescript(
  catalog: LocaleCatalog,
  supportedLocales: readonly string[],
  exportName: string
): CompileResult {
  const errors: string[] = []
  const localesVarName = `${exportName}Locales`
  const localesTypeName = `${capitalize(exportName)}Locales`
  const typeName = `${capitalize(exportName)}Entries`
  const value: Record<string, GeneratedEntry> = {}

  for (const locale of supportedLocales) {
    value[locale] = { type: 'nested', value: catalog[locale] ?? {} }
  }

  let source = '// AUTO-GENERATED. DO NOT EDIT.\n'
  source += '/* eslint-disable @stylistic/quote-props */\n'
  source += '/* eslint-disable no-useless-escape */\n'
  source += '/* eslint-disable @typescript-eslint/no-unused-vars */\n'
  source += 'import type { Translation } from \'@helpwave/internationalization\'\n'
  source += 'import { TranslationGen } from \'@helpwave/internationalization\'\n\n'
  source += `export const ${localesVarName} = [${supportedLocales.map(locale => quoteKey(locale)).join(', ')}] as const\n\n`
  source += `export type ${localesTypeName} = typeof ${localesVarName}[number]\n\n`
  source += `export type ${typeName} = {\n${generateType(catalog, supportedLocales)}}\n\n`
  source += `export const ${exportName}: Translation<${localesTypeName}, Partial<${typeName}>> = {\n${generateCode(value, errors)}}\n\n`

  return { source, errors }
}

export function compileTranslations(
  catalog: LocaleCatalog,
  config: IntlConfig,
  exportName: string
): CompileResult {
  switch (config.compileTo) {
    case 'typescript':
      return compileToTypescript(catalog, config.supportedLocales, exportName)
    default: {
      const target: never = config.compileTo
      return {
        source: '',
        errors: [`Compile target "${String(target)}" is not supported.`],
      }
    }
  }
}
