import fs from 'fs'
import os from 'os'
import path from 'path'
import { TranslationGen } from '../src'
import { parseBuildIntlArgs, resolveExportName } from '../src/scripts/cli-args'
import { collectTranslations } from '../src/scripts/collect-translations'
import { compileTranslations } from '../src/scripts/compile-typescript'
import { defaultIntlConfig, loadIntlConfig, type IntlConfig } from '../src/scripts/intl-config'
import { describeOutputChange } from '../src/scripts/output-diff'

const directories: string[] = []

function createWorkspace(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'build-intl-'))
  directories.push(directory)
  return directory
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

const baseConfig: IntlConfig = {
  supportedLocales: ['en-US', 'de-DE'],
  compileTo: 'typescript',
  name: 'appTranslation',
  outputFile: './i18n/translations.ts',
  translationFiles: [],
}

afterAll(() => {
  for (const directory of directories) {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

describe('parseBuildIntlArgs', () => {
  test('reads the config flag, options, and location paths', () => {
    const parsed = parseBuildIntlArgs([
      '--config',
      'intl.json',
      './locales',
      'messages/en-US.arb',
      '-o',
      'out.ts',
      '-n',
      'exampleTranslation',
      '--dry-run',
    ])

    expect(parsed).toEqual({
      configPath: 'intl.json',
      outputFile: 'out.ts',
      dryRun: true,
      help: false,
      name: 'exampleTranslation',
      locations: ['./locales', 'messages/en-US.arb'],
      errors: [],
    })
  })

  test('accepts -c, --config=, and paths after --', () => {
    const short = parseBuildIntlArgs(['-c', 'intl.json', '--', '--locales'])
    const equals = parseBuildIntlArgs(['--config=intl.json', 'locales'])

    expect(short.configPath).toBe('intl.json')
    expect(short.locations).toEqual(['--locales'])
    expect(short.errors).toEqual([])
    expect(equals).toMatchObject({
      configPath: 'intl.json',
      locations: ['locales'],
      errors: [],
    })
  })

  test('reports a missing config value and unknown options', () => {
    const parsed = parseBuildIntlArgs(['--config', '--out'])

    expect(parsed.errors).toEqual([
      'Option --config requires a value.',
      'Option --out requires a value.',
    ])
  })
})

describe('loadIntlConfig', () => {
  test('loads supported locales, datatypes, and the compile target', () => {
    const directory = createWorkspace()
    const configPath = path.join(directory, 'intl.json')
    writeJson(configPath, baseConfig)

    expect(loadIntlConfig(configPath)).toEqual(baseConfig)
  })

  test('uses defaults when options are omitted', () => {
    const directory = createWorkspace()
    const configPath = path.join(directory, 'intl.json')
    writeJson(configPath, { supportedLocales: ['fr-FR'] })
    writeJson(path.join(directory, 'empty.json'), {})

    expect(loadIntlConfig(path.join(directory, 'empty.json'))).toEqual(defaultIntlConfig())
    const parsed = parseBuildIntlArgs(['./locales', './shared/locales'])
    expect(parsed.configPath).toBeUndefined()
    expect(parsed.locations).toEqual(['./locales', './shared/locales'])
    expect(parsed.errors).toEqual([])
    expect(loadIntlConfig(configPath)).toEqual({
      supportedLocales: ['fr-FR'],
      compileTo: 'typescript',
      name: 'appTranslation',
      outputFile: './i18n/translations.ts',
      translationFiles: [],
    })
  })

  test('reads name, outputFile, and translationFiles', () => {
    const directory = createWorkspace()
    const configPath = path.join(directory, 'intl.json')
    writeJson(configPath, {
      name: 'exampleTranslation',
      outputFile: './examples/translations/translations.ts',
      translationFiles: ['./examples/locales', './extra/en-US.arb'],
    })

    const config = loadIntlConfig(configPath)
    expect(config.name).toBe('exampleTranslation')
    expect(config.outputFile).toBe('./examples/translations/translations.ts')
    expect(config.translationFiles).toEqual(['./examples/locales', './extra/en-US.arb'])
  })

  test('rejects compile targets other than typescript', () => {
    const directory = createWorkspace()
    const configPath = path.join(directory, 'intl.json')
    writeJson(configPath, { ...baseConfig, compileTo: 'python' })

    expect(() => loadIntlConfig(configPath)).toThrow('compileTo')
  })
})

describe('collectTranslations', () => {
  test('collects arb files from directories and file paths and applies @@prefix', () => {
    const directory = createWorkspace()
    const locales = path.join(directory, 'locales')
    const extra = path.join(directory, 'extra', 'de-DE.arb')
    writeJson(path.join(locales, 'nested', 'en-US.arb'), {
      '@@locale': 'en-US',
      '@@prefix': 'test',
      'name': 'Ada',
    })
    writeJson(path.join(locales, 'notes.txt'), { ignored: true })
    writeJson(extra, {
      '@@locale': 'de-DE',
      '@@prefix': 'test',
      'name': 'Ada',
    })

    const collected = collectTranslations([locales, extra], baseConfig)

    expect(collected.diagnostics.filter(item => item.level === 'error')).toEqual([])
    expect(collected.catalog['en-US']['test.name']).toEqual({ type: 'text', value: 'Ada' })
    expect(collected.catalog['de-DE']['test.name']).toEqual({ type: 'text', value: 'Ada' })
    expect(collected.catalog['en-US'].name).toBeUndefined()
  })

  test('does not prefix keys from a nested directory unless @@prefix is set', () => {
    const directory = createWorkspace()
    writeJson(path.join(directory, 'sub', 'en-US.arb'), {
      '@@locale': 'en-US',
      'name': 'Ada',
    })

    const collected = collectTranslations([directory], {
      ...baseConfig,
      supportedLocales: ['en-US'],
    })

    expect(collected.catalog['en-US'].name).toEqual({ type: 'text', value: 'Ada' })
    expect(collected.diagnostics.filter(item => item.level === 'error')).toEqual([])
  })

  test('requires @@locale and rejects locales outside the config', () => {
    const directory = createWorkspace()
    writeJson(path.join(directory, 'missing.arb'), { name: 'Ada' })
    writeJson(path.join(directory, 'other.arb'), { '@@locale': 'fr-FR', 'name': 'Ada' })

    const collected = collectTranslations([directory], {
      ...baseConfig,
      supportedLocales: ['en-US'],
    })
    const messages = collected.diagnostics.map(item => item.message).join('\n')

    expect(collected.diagnostics.some(item => item.level === 'error')).toBe(true)
    expect(messages).toEqual(expect.stringContaining('@@locale'))
    expect(messages).toEqual(expect.stringContaining('fr-FR'))
    expect(collected.catalog['fr-FR']).toBeUndefined()
  })

  test('warns about inconsistent keys and placeholder types', () => {
    const directory = createWorkspace()
    writeJson(path.join(directory, 'en-US.arb'), {
      '@@locale': 'en-US',
      'greet': 'Hello {name}',
      '@greet': { placeholders: { name: { type: 'string' } } },
      'onlyEnglish': 'Hi',
    })
    writeJson(path.join(directory, 'de-DE.arb'), {
      '@@locale': 'de-DE',
      'greet': 'Hallo',
    })

    const collected = collectTranslations([directory], baseConfig)
    const messages = collected.diagnostics.map(item => item.message)

    expect(collected.diagnostics.filter(item => item.level === 'error')).toEqual([])
    expect(messages).toEqual(expect.arrayContaining([
      expect.stringContaining('Key "onlyEnglish" is missing'),
      expect.stringContaining('Key "greet" has inconsistent typing'),
    ]))
    expect(messages.find(message => message.includes('inconsistent typing'))).toEqual(
      expect.stringContaining('"en-US" is (name: string) => string, "de-DE" is string')
    )
  })

  test('reports every unsupported placeholder type as an error', () => {
    const directory = createWorkspace()
    writeJson(path.join(directory, 'en-US.arb'), {
      '@@locale': 'en-US',
      'status': '{flag}',
      '@status': { placeholders: { flag: { type: 'bool' } } },
      'when': '{date}',
      '@when': { placeholders: { date: { type: 'Date' } } },
      'total': '{count}',
      '@total': { placeholders: { count: { type: 'int' } } },
      'items': '{count}',
      '@items': { placeholders: { count: {} } },
    })

    const collected = collectTranslations([directory], {
      ...baseConfig,
      supportedLocales: ['en-US'],
    })

    expect(collected.catalog['en-US'].status).toEqual({
      type: 'func',
      params: [{ name: 'flag', typing: 'string' }],
      value: '{flag}',
    })
    expect(collected.catalog['en-US'].total).toEqual({
      type: 'func',
      params: [{ name: 'count', typing: 'number', numeric: 'int' }],
      value: '{count}',
    })
    expect(collected.catalog['en-US'].items).toEqual({
      type: 'func',
      params: [{ name: 'count', typing: 'string' }],
      value: '{count}',
    })
    const unsupported = collected.diagnostics.filter(item => item.message.includes('is not supported'))
    expect(unsupported).toEqual([
      expect.objectContaining({ level: 'error', message: expect.stringContaining('Type "bool"') }),
      expect.objectContaining({ level: 'error', message: expect.stringContaining('Type "Date"') }),
    ])
    expect(collected.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        level: 'warning',
        message: expect.stringContaining('Placeholder [count] of [items]'),
      }),
      expect.objectContaining({
        level: 'warning',
        message: expect.stringContaining('Interpreting it as string.'),
      }),
    ]))
    expect(collected.diagnostics.some(item => item.message.includes('Type "int"'))).toBe(false)
  })

  test('warns when a supported locale has no file', () => {
    const directory = createWorkspace()
    writeJson(path.join(directory, 'en-US.arb'), {
      '@@locale': 'en-US',
      'name': 'Ada',
    })

    const collected = collectTranslations([directory], baseConfig)

    expect(collected.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        level: 'warning',
        message: expect.stringContaining('Supported locale "de-DE" has no .arb file.'),
      }),
    ]))
  })
})

describe('TranslationGen.round', () => {
  test('rounds a number to a string', () => {
    expect(TranslationGen.round(1.6)).toBe('2')
    expect(TranslationGen.round(1.2)).toBe('1')
    expect(TranslationGen.round(-1.2)).toBe('-1')
  })
})

describe('compileTranslations', () => {
  test('rounds int and float placeholders before inserting them', () => {
    const directory = createWorkspace()
    writeJson(path.join(directory, 'en-US.arb'), {
      '@@locale': 'en-US',
      'total': '{count} items',
      '@total': { placeholders: { count: { type: 'int' } } },
      'price': '{amount}',
      '@price': { placeholders: { amount: { type: 'float' } } },
      'items': '{count, plural, =1{# item} other{# items}}',
      '@items': { placeholders: { count: { type: 'int' } } },
    })
    const config: IntlConfig = {
      supportedLocales: ['en-US'],
      compileTo: 'typescript',
      name: 'appTranslation',
      outputFile: './i18n/translations.ts',
      translationFiles: [],
    }
    const collected = collectTranslations([directory], config)
    const compiled = compileTranslations(collected.catalog, config, 'app')

    expect(collected.diagnostics.filter(item => item.level === 'error')).toEqual([])
    expect(collected.catalog['en-US'].total).toEqual({
      type: 'func',
      params: [{ name: 'count', typing: 'number', numeric: 'int' }],
      value: '{count} items',
    })
    expect(collected.catalog['en-US'].price).toEqual({
      type: 'func',
      params: [{ name: 'amount', typing: 'number', numeric: 'float' }],
      value: '{amount}',
    })
    expect(compiled.errors).toEqual([])
    expect(compiled.source).toContain('count: number')
    expect(compiled.source).toContain('amount: number')
    expect(compiled.source).toContain('${TranslationGen.round(count)} items')
    expect(compiled.source).toContain('return `${TranslationGen.round(amount)}`')
    expect(compiled.source).toContain('TranslationGen.resolvePlural(count, {')
    expect(compiled.source).toContain('${TranslationGen.round(count)} item')
  })

  test('compiles prefixed keys to typescript', () => {
    const directory = createWorkspace()
    writeJson(path.join(directory, 'en-US.arb'), {
      '@@locale': 'en-US',
      '@@prefix': 'test',
      'name': 'Ada',
      'total': '{count} items',
      '@total': { placeholders: { count: { type: 'int' } } },
    })
    const config: IntlConfig = {
      ...baseConfig,
      supportedLocales: ['en-US'],
    }
    const collected = collectTranslations([directory], config)
    const compiled = compileTranslations(collected.catalog, config, 'exampleTranslation')

    expect(compiled.errors).toEqual([])
    expect(compiled.source).toContain("export const exampleTranslationLocales = ['en-US'] as const")
    expect(compiled.source).toContain("'test.name': `Ada`")
    expect(compiled.source).toContain("'test.total': ({ count }): string => {")
    expect(compiled.source).toContain('count: number')
  })

  test('matches the checked-in example translation', () => {
    const config = loadIntlConfig(path.resolve('examples/intl.config.json'))
    const collected = collectTranslations([path.resolve('examples/locales')], config)
    const compiled = compileTranslations(collected.catalog, config, 'exampleTranslation')
    const expected = fs.readFileSync(path.resolve('examples/translations/translations.ts'), 'utf-8')

    expect(collected.diagnostics.filter(item => item.level === 'error')).toEqual([])
    expect(compiled.errors).toEqual([])
    expect(compiled.source).toBe(expected)
  })
})

describe('describeOutputChange', () => {
  test('prints a diff for a new or changed file', () => {
    expect(describeOutputChange('out.ts', 'alpha\nbeta\n', 'alpha\nbeta\n')).toBe('No changes to out.ts')

    const created = describeOutputChange('out.ts', undefined, 'hello\n')
    expect(created).toContain('Would create out.ts')
    expect(created).toContain('+hello')

    const updated = describeOutputChange('out.ts', 'alpha\nbeta\n', 'alpha\ngamma\n')
    expect(updated).toContain('Would update out.ts')
    expect(updated).toContain('-beta')
    expect(updated).toContain('+gamma')
  })
})

describe('resolveExportName', () => {
  test('keeps a valid name and rewrites separators', () => {
    expect(resolveExportName('exampleTranslation')).toEqual({ name: 'exampleTranslation' })
    expect(resolveExportName('my-translation').name).toBe('my_translation')
    expect(resolveExportName('Example').error).toEqual(expect.stringContaining('invalid'))
  })
})
