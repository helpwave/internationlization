#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import type { ICUASTNode } from '@/src'
import { ICUUtil } from '@/src'

/* ------------------ types ------------------ */

interface PlaceholderMeta {
  type?: string,
}

interface ARBPlaceholders {
  [key: string]: PlaceholderMeta,
}

interface ARBMeta {
  placeholders?: ARBPlaceholders,
}

interface ARBFile {
  [key: string]: string | ARBMeta,
}

interface FuncParam {
  name: string,
  typing: string,
}

type TranslationEntry =
  { type: 'text', value: string }
  | { type: 'func', params: FuncParam[], value: string }
  | { type: 'nested', value: Record<string, TranslationEntry> }

/* ------------------ CLI args ------------------ */
function parseArgs() {
  const args = process.argv.slice(2)
  const result: {
    input?: string,
    outputFile?: string,
    force: boolean,
    help: boolean,
    name: string,
  } = {
    force: false,
    help: false,
    name: 'generatedTranslation'
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--in':
      case '-i':
        result.input = args[++i]
        break

      case '--out':
      case '-o':
        result.outputFile = args[++i]
        break

      case '--name':
      case '-n':
        result.name = args[++i]
        break

      case '--force':
      case '-f':
        result.force = true
        break

      case '--help':
      case '-h':
        result.help = true
        break
    }
  }

  return result
}


function printHelp() {
  console.info(`
Usage: i18n-compile [options]

Options:
  -i, --in <dir>        Input directory containing .arb files
  -o, --out <file>      Output file (e.g. ./i18n/translations.ts)
  -f, --force           Overwrite output without prompt
  -n, --name <name>     The name for exported translation within the code
  -h, --help            Show this help message
`)
}

const parsed = parseArgs()

if (parsed.help) {
  printHelp()
  process.exit(0)
}

const inputDir =
  parsed.input || path.resolve(process.cwd(), './locales')

// Default output file if none given
const OUTPUT_FILE =
  parsed.outputFile ||
  path.resolve(process.cwd(), './i18n/translations.ts')

const force = parsed.force

const outputDir = path.dirname(OUTPUT_FILE)

const name = parsed.name
  .replace(/[^a-zA-Z0-9]/g, '_')
  .replace(/^[0-9]/, '')

if (name.length < 1 || name[0].toUpperCase() === name[0]) {
  console.error(`The name ${parsed.name} is invalid. Use [a-z][a-zA-Z0-9_]+`)
  process.exit(0)
} else if (name.length !== parsed.name.length) {
  console.warn(`The name ${parsed.name} cannot start with a number.`)
}

/* ------------------ prompts ------------------ */

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise(resolve =>
    rl.question(query, ans => {
      rl.close()
      resolve(ans)
    }))
}

/* ------------------ I/O helpers ------------------ */

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const capitalize = (s: string): string => {
  if (s.length > 0) {
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  return s
}


const locales = new Set<string>()

/* ------------------ ARB reader ------------------ */

function readARBDir(
  dir: string,
  prefix = ''
): Record<string, Record<string, TranslationEntry>> {
  const result: Record<string, Record<string, TranslationEntry>> = {}

  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      const newPrefix = prefix ? `${prefix}.${entry.name}` : entry.name
      const values = readARBDir(fullPath, newPrefix)
      for (const locale of locales) {
        if (values[locale]) {
          if (!result[locale]) result[locale] = {}
          Object.assign(result[locale], values[locale])
        }
      }
      continue
    }

    if (!entry.isFile() || !entry.name.endsWith('.arb')) continue

    const locale = path.basename(entry.name, '.arb')
    locales.add(locale)

    const raw = fs.readFileSync(fullPath, 'utf-8')
    const content: ARBFile = JSON.parse(raw)

    if (!result[locale]) result[locale] = {}

    for (const [key, value] of Object.entries(content)) {
      if (key.startsWith('@')) continue

      const meta = content[`@${key}`] as ARBMeta | undefined
      const flatKey = prefix ? `${prefix}.${key}` : key

      let entryObj: TranslationEntry

      try {
        if (meta?.placeholders) {
          // ICU function
          const params: FuncParam[] = Object.entries(meta.placeholders).map(
            ([name, def]) => {
              let typing = def.type
              if (!typing) {
                if (['count', 'amount', 'length', 'number'].includes(name)) {
                  typing = 'number'
                } else if (['date', 'dateTime'].includes(name)) {
                  typing = 'Date'
                } else {
                  typing = 'string'
                }
              }
              return { name, typing }
            }
          )

          entryObj = {
            type: 'func',
            params,
            value: value as string,
          }
        } else {
          entryObj = {
            type: 'text',
            value: value as string
          }
        }

        result[locale][flatKey] = entryObj
      }catch (e) {
        console.error(`Failed to load [${key}] in file ${fullPath}`, e)
      }
    }
  }

  return result
}

/* ------------------ code generator: values ------------------ */

function escapeForTemplateJS(s: string): string {
  return s
    .replace(/\\/g, `\\\\`)
    .replace(/`/g, `\\\``)
    .replace(/\$/g, `\\$`)
}

type CompileContext = {
  numberParam?: string,
  inNode: boolean,
  indentLevel: number,
  isOnlyText: boolean,
}

const defaultCompileContext: CompileContext = {
  indentLevel: 0,
  inNode: false,
  isOnlyText: false,
}

function compile(
  node: ICUASTNode,
  context: CompileContext = defaultCompileContext
): string[] {
  const lines: string[] = []
  let currentLine = ''
  const isTopLevel = context.indentLevel === 0

  function indent(level: number = context.indentLevel) {
    return ' '.repeat(level * 2)
  }

  function flushCurrent() {
    if (currentLine) {
      if (context.inNode) {
        lines.push(currentLine)
      } else {
        const prefix =
          context.isOnlyText ? '' :
            !isTopLevel ? indent()
              : '_out += '
        const nextLine = `${prefix}\`${currentLine}\``
        lines.push(nextLine)
      }
    }
    currentLine = ''
  }

  switch (node.type) {
    case 'Text':
      currentLine += escapeForTemplateJS(node.value)
      break
    case 'NumberField':
      if (context.numberParam) {
        currentLine += `$\{${context.numberParam}}`
      } else {
        currentLine += `{${context.numberParam}}`
      }
      break
    case 'SimpleReplace':
      currentLine += `$\{${node.variableName}}`
      break
    case 'Node': {
      for (const partNode of node.parts) {
        const compiled = compile(partNode, { ...context, inNode: true })
        if (partNode.type === 'OptionReplace' || partNode.type === 'Node') {
          flushCurrent()
          lines.push(...compiled)
        } else {
          currentLine += compiled[0]
        }
      }
      break
    }
    case 'OptionReplace': {
      if (context.isOnlyText) {
        currentLine += `{${node.variableName}, ${node.operatorName}, {options}}`
        break
      }
      flushCurrent()
      lines.push(`${isTopLevel ? '_out += ' : ''}TranslationGen.resolveSelect(${node.variableName}, {`)

      const entries = Object.entries(node.options)

      for (const [key, entryNode] of entries) {
        const numberParamUpdate = node.operatorName === 'plural' ? key : undefined
        const expr = compile(entryNode, {
          ...context,
          numberParam: numberParamUpdate ?? context.numberParam,
          indentLevel: context.indentLevel + 1,
          inNode: false,
        })
        if (expr.length === 0) continue
        lines.push(indent(context.indentLevel + 1) + `'${key}': ${expr[0].trimStart()}`, ...expr.slice(1))
        lines[lines.length - 1] += ','
      }

      lines.push(indent() + `})`)
      return lines
    }
  }
  flushCurrent()
  return lines
}


function generateCode(
  obj: Record<string, TranslationEntry>,
  indentLevel = 1
): string {
  const indent = '  '.repeat(indentLevel)
  const entries = Object.entries(obj).sort((a, b) =>
    a[0].localeCompare(b[0]))

  let str = ''

  for (const [key, entry] of entries) {
    const quotedKey = `'${key}'`
    const isLast = entries[entries.length - 1][0] === key
    const comma = isLast ? '' : ','

    try {
      if (entry.type === 'func') {
        const ast = ICUUtil.parse(ICUUtil.lex(entry.value))
        let compiled = compile(ast)
        if (compiled.filter(value => value.startsWith('_out +=')).length === 1) {
          const first = compiled.findIndex(value => value.startsWith('_out +='))
          compiled[first] = 'return ' + compiled[first].slice(8)
        } else {
          compiled = [
            "let _out: string = ''",
            ...compiled,
            'return _out',
          ]
        }
        const functionLines: string[] = [
          `({ ${entry.params.map(value => value.name).join(', ')} }): string => {`,
          ...compiled.map(value => `  ${value}`),
          '}',
        ]
        str += `${indent}${quotedKey}: ${functionLines.join(`\n${indent}`)}${comma}\n`
      } else if (entry.type === 'text') {
        const ast = ICUUtil.parse(ICUUtil.lex(entry.value))
        const compiled = compile(ast, { ...defaultCompileContext, isOnlyText: true })
        const text = compiled.length === 1 ? compiled[0] : `\`${escapeForTemplateJS(entry.value)}\``
        str += `${indent}${quotedKey}: ${text}${comma}\n`
      } else {
        // nested object
        str += `${indent}${quotedKey}: {\n`
        str += generateCode(entry.value, indentLevel + 1)
        str += `${indent}}${comma}\n`
      }
    } catch (e) {
      console.error(`Failed to compile key [${key}] with value "${entry.value}"`, e)
    }
  }

  return str
}

/* ------------------ code generator: type ------------------ */

function generateType(
  translationData: Record<string, Record<string, TranslationEntry>>
): string {
  const indent = '  '
  const fullObject: Record<string, TranslationEntry> = {}
  const completedLocales: string[] = []

  for (const locale of locales) {
    const localizedEntries = Object.entries(
      translationData[locale]
    ).sort((a, b) => a[0].localeCompare(b[0]))

    for (const [name, entry] of localizedEntries) {
      if (!fullObject[name]) {
        fullObject[name] = entry
        continue
      }

      // type consistency is logged but not enforced
    }
    completedLocales.push(locale)
  }

  let str = ''

  for (const [key, entry] of Object.entries(fullObject)) {
    const quotedKey = `'${key}'`

    if (entry.type === 'func') {
      const params = entry.params
        .map(p => `${p.name}: ${p.typing}`)
        .join(', ')
      str += `${indent}${quotedKey}: (values: { ${params} }) => string,\n`
    } else if (entry.type === 'text') {
      str += `${indent}${quotedKey}: string,\n`
    }
  }

  return str
}

/* ------------------ main ------------------ */

async function main(): Promise<void> {
  const translationData = readARBDir(inputDir)

  let output = `// AUTO-GENERATED. DO NOT EDIT.\n`
  output += '/* eslint-disable @stylistic/quote-props */\n'
  output += '/* eslint-disable no-useless-escape */\n'
  output += '/* eslint-disable @typescript-eslint/no-unused-vars */\n'

  output += `import type { Translation } from '@helpwave/internationalization'\n`
  output += `import { TranslationGen } from '@helpwave/internationalization'\n\n`

  const localesVarName = `${name}Locales`
  const localesTypeName = `${capitalize(name)}Locales`
  output += `export const ${localesVarName} = [${[
    ...locales.values()
  ]
    .map(v => `'${v}'`)
    .join(', ')}] as const\n\n`

  output += `export type ${localesTypeName} = typeof ${localesVarName}[number]\n\n`

  const typeName = `${capitalize(name)}Entries`
  const generatedTyping = generateType(translationData)
  output += `export type ${typeName} = {\n${generatedTyping}}\n\n`

  const value: Record<string, TranslationEntry> = {}
  for (const locale of locales) {
    value[locale] = { type: 'nested', value: translationData[locale] }
  }

  const generatedTranslation = generateCode(value)
  output += `export const ${name}: Translation<${localesTypeName}, Partial<${typeName}>> = {\n${generatedTranslation}}\n\n`

  if (fs.existsSync(OUTPUT_FILE) && !force) {
    const answer = await askQuestion(
      `File "${OUTPUT_FILE}" already exists. Overwrite? (y/N): `
    )
    if (!['y', 'yes'].includes(answer.trim().toLowerCase())) {
      console.info('Aborted.')
      return
    }
  }

  fs.writeFileSync(OUTPUT_FILE, output)
  console.info(`✓ Translations compiled to ${OUTPUT_FILE}`)
  console.info(`Input folder: ${inputDir}`)
  console.info(`Output folder: ${outputDir}`)
}

main()
