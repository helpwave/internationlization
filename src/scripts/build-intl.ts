#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { parseBuildIntlArgs, resolveExportName } from './cli-args'
import { collectTranslations, type IntlDiagnostic } from './collect-translations'
import { compileTranslations } from './compile-typescript'
import { loadIntlConfig, type IntlConfig } from './intl-config'
import { describeOutputChange } from './output-diff'

function printHelp(): void {
  console.info(`
Usage: build-intl --config <path> [options] [location ...]

Collects .arb files from the given files and directories and compiles them.
Repeat location to pass more than one file or directory.
When no locations are given, translationFiles from the config is used.

Options:
  -c, --config <path>   JSON configuration file
  -o, --out <file>      Output file (overrides config outputFile)
  -n, --name <name>     Exported translation name (overrides config name)
  --dry-run             Print the output diff without writing the file
  -h, --help            Show this help message

Configuration file:
  {
    "supportedLocales": ["en-US", "de-DE"],
    "compileTo": "typescript",
    "name": "appTranslation",
    "outputFile": "./i18n/translations.ts",
    "translationFiles": []
  }

Omitted fields use those defaults.
List one or more paths in translationFiles, or pass them after the options.
Existing output files are overwritten.
Each .arb file must set @@locale to a supported locale.
@@prefix optionally prefixes every key in that file (prefix "test" exposes "name" as "test.name").
Placeholder types other than string, int, and float are errors. The output file is not written when the build reports an error.
int and float are number parameters. Their values are rounded before they are inserted into the string.
Keys or placeholder types that differ between locales are reported as warnings.
`)
}

function reportDiagnostics(diagnostics: readonly IntlDiagnostic[]): void {
  for (const diagnostic of diagnostics) {
    const line = `${diagnostic.level}: ${diagnostic.message}`
    if (diagnostic.level === 'error') console.error(line)
    else console.warn(line)
  }
}

function resolveLocations(cliLocations: readonly string[], configLocations: readonly string[]): string[] {
  if (cliLocations.length > 0) return [...cliLocations]
  return [...configLocations]
}

function main(): void {
  const args = parseBuildIntlArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    process.exit(0)
  }
  if (args.errors.length > 0) {
    for (const message of args.errors) console.error(`error: ${message}`)
    process.exit(1)
  }
  if (!args.configPath) {
    console.error('error: Missing required option --config <path>.')
    printHelp()
    process.exit(1)
  }

  let config: IntlConfig
  try {
    config = loadIntlConfig(args.configPath)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.error(`error: ${reason}`)
    process.exit(1)
  }

  const exportName = resolveExportName(args.name ?? config.name)
  if (exportName.error) {
    console.error(`error: ${exportName.error}`)
    process.exit(1)
  }
  if (exportName.warning) console.warn(`warning: ${exportName.warning}`)

  const locations = resolveLocations(args.locations, config.translationFiles)
  if (locations.length === 0) {
    console.error('error: Provide at least one .arb file or directory, or set translationFiles in the config.')
    process.exit(1)
  }

  const collected = collectTranslations(locations, config)
  const compiled = compileTranslations(collected.catalog, config, exportName.name)
  reportDiagnostics(collected.diagnostics)
  for (const message of compiled.errors) console.error(`error: ${message}`)

  const errorCount = collected.diagnostics.filter(diagnostic => diagnostic.level === 'error').length
    + compiled.errors.length
  if (errorCount > 0) {
    console.error(`Build failed with ${errorCount} error(s). The output file was not written.`)
    process.exit(1)
  }

  const outputFile = path.resolve(args.outputFile ?? config.outputFile)
  if (args.dryRun) {
    const previous = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, 'utf-8') : undefined
    console.info(describeOutputChange(outputFile, previous, compiled.source))
    return
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true })
  fs.writeFileSync(outputFile, compiled.source)

  const warningCount = collected.diagnostics.filter(diagnostic => diagnostic.level === 'warning').length
  if (warningCount > 0) {
    console.warn(`Compiled with ${warningCount} warning(s).`)
  }
  console.info(`Translations compiled to ${outputFile}`)
}

try {
  main()
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error)
  console.error(`error: ${reason}`)
  process.exit(1)
}
