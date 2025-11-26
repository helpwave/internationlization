import { escapeCharacter } from './icu'

export type ICUToken =
  | { type: 'LBRACE' }
  | { type: 'RBRACE' }
  | { type: 'COMMA' }
  | { type: 'HASHTAG' }
  | { type: 'ESCAPE' }
  | { type: 'WHITESPACE', value: string }
  | { type: 'TEXT', value: string }

/**
 * Takes in a sting and converts it to a list of ICUToken's
 * ICU uses single quotes to quote literal text. This means:
 * '' -> '
 * '...anything...' -> literal anything (but two single quotes inside become one)
 *  @param input The string to tokenize
 */
export function lex(input: string): ICUToken[] {
  const tokens: ICUToken[] = []

  function pushAppend(text: string, type: 'TEXT' | 'WHITESPACE') {
    if (tokens.length > 0) {
      const last = tokens[tokens.length - 1]
      if (last.type === type) {
        last.value += text
        return
      }
    }
    tokens.push({ type, value: text })
  }

  for (let index = 0; index < input.length; index++) {
    const character = input[index]
    switch (character) {
      case '{':
        tokens.push({ type: 'LBRACE' })
        break
      case '}':
        tokens.push({ type: 'RBRACE' })
        break
      case '#':
        tokens.push({ type: 'HASHTAG' })
        break
      case ',':
        tokens.push({ type: 'COMMA' })
        break
      case escapeCharacter:
        tokens.push({ type: 'ESCAPE' })
        break
      case ' ':
        pushAppend(character, 'WHITESPACE')
        break
      default:
        pushAppend(character, 'TEXT')
        break
    }
  }

  return tokens
}