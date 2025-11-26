import { lex } from './lex'
import { parse } from './parse'
import { compileToString } from './compile-to-string'
import type { ICUCompilerValues } from './compile-to-string'

export const escapeCharacter = "'"

function interpret(message: string, values: ICUCompilerValues): string {
  try {
    return compileToString(parse(lex(message)), values)
  } catch (e) {
    console.error(`Failed to interpret message: ${message}`, e)
    return message
  }
}

export const ICUUtil = {
  lex,
  parse,
  compile: compileToString,
  interpret,
  escapeCharacter
}
