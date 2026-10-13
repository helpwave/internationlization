export interface BuildIntlArgs {
  configPath?: string,
  outputFile?: string,
  dryRun: boolean,
  help: boolean,
  name?: string,
  locations: string[],
  errors: string[],
}

export interface ExportName {
  name: string,
  warning?: string,
  error?: string,
}

export function resolveExportName(raw: string): ExportName {
  const name = raw.replace(/[^a-zA-Z0-9]/g, '_').replace(/^[0-9]/, '')
  if (!/^[a-z][a-zA-Z0-9_]*$/.test(name)) {
    return {
      name,
      error: `The name "${raw}" is invalid. Use [a-z][a-zA-Z0-9_]+.`,
    }
  }
  if (name !== raw) {
    return {
      name,
      warning: `The name "${raw}" was changed to "${name}".`,
    }
  }
  return { name }
}

function readOptionValue(
  args: BuildIntlArgs,
  argv: readonly string[],
  index: number,
  flag: string
): string | undefined {
  const value = argv[index + 1]
  if (value === undefined || value.startsWith('-')) {
    args.errors.push(`Option ${flag} requires a value.`)
    return undefined
  }
  return value
}

export function parseBuildIntlArgs(argv: readonly string[]): BuildIntlArgs {
  const args: BuildIntlArgs = {
    dryRun: false,
    help: false,
    locations: [],
    errors: [],
  }

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]

    if (arg === '--') {
      args.locations.push(...argv.slice(index + 1))
      break
    }
    if (arg === '--help' || arg === '-h') {
      args.help = true
      continue
    }
    if (arg === '--dry-run') {
      args.dryRun = true
      continue
    }
    if (arg === '--config' || arg === '-c') {
      const value = readOptionValue(args, argv, index, arg)
      if (value !== undefined) {
        args.configPath = value
        index++
      }
      continue
    }
    if (arg.startsWith('--config=')) {
      const value = arg.slice('--config='.length)
      if (value.length === 0) args.errors.push('Option --config requires a value.')
      else args.configPath = value
      continue
    }
    if (arg === '--out' || arg === '-o') {
      const value = readOptionValue(args, argv, index, arg)
      if (value !== undefined) {
        args.outputFile = value
        index++
      }
      continue
    }
    if (arg.startsWith('--out=')) {
      const value = arg.slice('--out='.length)
      if (value.length === 0) args.errors.push('Option --out requires a value.')
      else args.outputFile = value
      continue
    }
    if (arg === '--name' || arg === '-n') {
      const value = readOptionValue(args, argv, index, arg)
      if (value !== undefined) {
        args.name = value
        index++
      }
      continue
    }
    if (arg.startsWith('--name=')) {
      const value = arg.slice('--name='.length)
      if (value.length === 0) args.errors.push('Option --name requires a value.')
      else args.name = value
      continue
    }
    if (arg.startsWith('-')) {
      args.errors.push(`Unknown option "${arg}".`)
      continue
    }

    args.locations.push(arg)
  }

  return args
}
