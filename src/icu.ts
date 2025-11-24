const escapeCharacter = "'"

/////////////
// Lexer
/////////////

export type ICUToken =
  | { type: 'LBRACE' }
  | { type: 'RBRACE' }
  | { type: 'COMMA' }
  | { type: 'HASHTAG' }
  | { type: 'ESCAPE' }
  | { type: 'WHITESPACE', value: string }
  | { type: 'TEXT', value: string }

/**
 * ICU uses single quotes to quote literal text. This means:
 * '' -> '
 * '...anything...' -> literal anything (but two single quotes inside become one)
 */
function lex(input: string): ICUToken[] {
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

/////////////
// Parser -> AST
/////////////

const replaceOperations = ['plural', 'select'] as const
type ReplaceOperation = typeof replaceOperations[number]

export type ICUASTNode =
  | { type: 'Node', parts: ICUASTNode[] }
  | { type: 'Text', value: string }
  | { type: 'NumberField' }
  | { type: 'SimpleReplace', variableName: string } // {name}
  | { type: 'OptionReplace', variableName: string, operatorName: ReplaceOperation, options: Record<string, ICUASTNode> } // {var, select, key{msg} ...}

type ParserState = { name: 'escape' } |
  { name: 'normal' } |
  {
    name: 'replaceFunction',
    expect: ReplaceExpectState,
    variableName: string,
    subtree: ICUASTNode[],
    operatorName?: ReplaceOperation,
    optionName: string,
    options: Record<string, ICUASTNode>,
  }

type ReplaceExpectState =
  'variableName'
  | 'variableNameCommaOrSimpleReplaceClose'
  | 'operatorName'
  | 'operatorNameComma'
  | 'optionNameOrReplaceClose'
  | 'optionOpen'
  | 'optionContentOrClose'

type ParserContext = {
  state: ParserState[],
  last?: ICUToken,
}

function parse(tokens: ICUToken[]): ICUASTNode {
  const result: ICUASTNode[] = []

  const context: ParserContext = {
    state: [{ name: 'normal' }],
  }

  function getState() {
    const state = context.state[context.state.length - 1]
    if (!state) {
      throw new Error('ICU Parser: Reached invalid state')
    }
    return state
  }

  function getStateName() {
    return getState().name
  }

  function pushText(text: string, target: ICUASTNode[] = result) {
    if (target.length > 0) {
      const last = target[target.length - 1]
      if (last.type === 'Text') {
        last.value += text
        return
      }
    }
    target.push({ type: 'Text', value: text })
  }

  function inNormal(token: ICUToken) {
    switch (token.type) {
      case 'RBRACE':
        throw Error('ICU Parser: Read an unescaped "}" before reading a "{"')
      case 'LBRACE':
        context.state.push({
          name: 'replaceFunction',
          expect: 'variableName',
          variableName: '',
          optionName: '',
          options: {},
          subtree: [],
        })
        break
      case 'ESCAPE':
        context.state.push({ name: 'escape' })
        break
      case 'COMMA':
        pushText(',')
        break
      case 'HASHTAG':
        pushText('#')
        break
      case 'TEXT':
        pushText(token.value)
        break
      case 'WHITESPACE':
        pushText(token.value)
        break
    }
  }

  function inEscape(token: ICUToken) {
    const prevState = context.state[context.state.length - 1]
    let pushFunction: (value: string) => void = pushText
    if (prevState && prevState.name === 'replaceFunction' && prevState.expect === 'operatorName') {
      pushFunction = (value: string) => pushText(value, prevState.subtree)
    }

    switch (token.type) {
      case 'ESCAPE':
        if (context.last?.type === 'ESCAPE') {
          pushFunction(escapeCharacter)
        }
        context.state.pop()
        break
      case 'COMMA':
        pushFunction(',')
        break
      case 'HASHTAG':
        pushFunction('#')
        break
      case 'LBRACE':
        pushFunction('{')
        break
      case 'RBRACE':
        pushFunction('}')
        break
      default:
        pushFunction(token.value)
    }
  }

  // Closing and opening brackets are already removed
  function inReplaceFunction(token: ICUToken) {
    const state = getState()
    if (state.name !== 'replaceFunction') {
      throw Error(`ICU Parser: Invalid State of Parser. Contact Package developer.`)
    }
    switch (token.type) {
      case 'ESCAPE':
        if (state.expect !== 'optionContentOrClose') {
          throw Error(`ICU Parser: Invalid Escape character "'". Escape characters are only valid outside of replacement functions or in the option content.`)
        }
        context.state.push({ name: 'escape' })
        break
      case 'LBRACE':
        if (state.expect === 'optionOpen') {
          state.expect = 'optionContentOrClose'
        } else if (state.expect === 'optionContentOrClose') {
          context.state.push({
            name: 'replaceFunction',
            expect: 'variableName',
            variableName: '',
            optionName: '',
            options: {},
            subtree: []
          })
        } else {
          throw Error(`ICU Parser: Invalid placement of "{" in replacement function.`)
        }
        break
      case 'RBRACE':
        if (state.expect === 'variableNameCommaOrSimpleReplaceClose') {
          context.state.pop()
          const prevState = getState()
          const node: ICUASTNode = {
            type: 'SimpleReplace',
            variableName: state.variableName
          }
          if (prevState.name === 'replaceFunction') {
            prevState.subtree.push(node)
          } else {
            result.push(node)
          }
        } else if (state.expect === 'optionContentOrClose') {
          const subTree =  state.subtree
          state.options[state.optionName] = subTree.length === 1 ? subTree[0] : { type: 'Node', parts: subTree }
          state.expect = 'optionNameOrReplaceClose'
          state.subtree = []
        } else if (state.expect === 'optionNameOrReplaceClose') {
          context.state.pop()
          const prevState = getState()
          if(!state.operatorName) {
            throw Error(`ICU Parser: Internal Parser Error. Operator name undefined in state.`)
          }
          const node: ICUASTNode = {
            type: 'OptionReplace',
            variableName: state.variableName,
            operatorName: state.operatorName,
            options: state.options,
          }
          if (prevState.name === 'replaceFunction') {
            prevState.subtree.push(node)
          } else {
            result.push(node)
          }
        } else {
          throw Error(`ICU Parser: Invalid placement of "}" in replacement function.`)
        }
        break
      case 'HASHTAG': {
        if (state.expect === 'optionContentOrClose') {
          if (state.operatorName === 'plural') {
            state.subtree.push({ type: 'NumberField' })
          } else {
            pushText('#', state.subtree)
          }
        } else {
          throw Error(`ICU Parser: Invalid placement of "#". "#" are only valid outside of replacement functions or in the option content.`)
        }
        break
      }
      case 'COMMA':
        if (state.expect === 'operatorNameComma') {
          state.expect = 'optionNameOrReplaceClose'
        } else if (state.expect === 'variableNameCommaOrSimpleReplaceClose') {
          state.expect = 'operatorName'
        } else if (state.expect === 'optionContentOrClose') {
          pushText(',', state.subtree)
        } else {
          throw Error(`ICU Parser: Invalid placement of "," in replacement function.`)
        }
        break
      case 'WHITESPACE':
        if (state.expect === 'optionContentOrClose') {
          pushText(token.value, state.subtree)
        }
        break
      case 'TEXT':
        if (state.expect === 'variableName') {
          state.variableName = token.value
          state.expect = 'variableNameCommaOrSimpleReplaceClose'
        } else if (state.expect === 'operatorName') {
          if (replaceOperations.some(value => value === token.value)) {
            state.operatorName = token.value as ReplaceOperation
          } else {
            throw Error(`ICU Parser: ${token.value} is an invalid replacement function operator. Allowed are ${replaceOperations.map(value => `"${value}"`).join(', ')}`)
          }
          state.expect = 'operatorNameComma'
        } else if (state.expect === 'optionNameOrReplaceClose') {
          state.optionName = token.value
          state.expect = 'optionOpen'
        } else if (state.expect === 'optionContentOrClose') {
          pushText(token.value, state.subtree)
        } else {
          throw Error('ICU Parser: Invalid position of a Text block in a replacement function.')
        }
        break
    }
  }

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index]
    const state = getStateName()

    if (state === 'normal') {
      inNormal(token)
    } else if (state === 'replaceFunction') {
      inReplaceFunction(token)
    } else if (state === 'escape') {
      inEscape(token)
    }
    context.last = token
  }

  const state = getStateName()

  if (state === 'replaceFunction') {
    throw Error(`ICU Parse: Encountered unclosed "{"`)
  } else if (state === 'escape') {
    throw Error(`ICU Parse: Encountered unclosed escape "'"`)
  }
  return result.length !== 1 ? { type: 'Node', parts: result } : result[0]
}

/////////////
// Compiler
/////////////

type CompilerContext = {
  hashtagReplacer?: number,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ICUCompilerValues = Record<string, any>

function compile(node: ICUASTNode, values: ICUCompilerValues, context: CompilerContext = {}): string {
  switch (node.type) {
    case 'Node': {
      return node.parts.map(p => compile(p, values, context)).join('')
    }
    case 'Text':
      return node.value
    case 'SimpleReplace': {
      const name = node.variableName
      if (values && values[name] !== undefined) return String(values[name])
      console.warn(`ICU Compile: missing value for ${name}`)
      return `{${name}}`
    }
    case 'OptionReplace': {
      const name = node.variableName
      const operation = node.operatorName
      const val = values ? values[name] : undefined
      switch (operation) {
        case 'plural': {
          const num = Number(val)
          if (isNaN(num)) {
            console.warn(`ICU Compile: plural expected numeric value for ${name}, got ${val}`)
            return `{${name}}`
          }
          const pluralKey =
            num === 0 ? '=0' :
              num === 1 ? '=1' :
                num === 2 ? '=2' :
                  num > 2 && num < 5 ? 'few' :
                    num >= 5 ? 'many' : 'other'

          const chosen = node.options[pluralKey] ?? node.options['other']
          if (!chosen) {
            console.warn(`ICU Compile: plural for ${name} could not find key ${pluralKey} and no other`)
            return `{${name}}`
          }
          return compile(chosen, values, { ...context, hashtagReplacer: num })
        }
        case 'select': {
          if (val === undefined) {
            console.warn(`ICU Compile: missing value for select ${name}`)
            const other = node.options['other']
            return other ? compile(other, values, context) : `{${name}}`
          }
          const chosen = node.options[String(val)] ?? node.options['other']
          if (!chosen) {
            console.warn(`ICU Compile: select ${name} chose undefined option "${val}" and no "other" provided`)
            return `{${name}}`
          }
          return compile(chosen, values, context)
        }
        default: {
          return `{${name}, ${operation}}`
        }
      }
    }
    case 'NumberField': {
      if (context.hashtagReplacer !== undefined) {
        return `${context.hashtagReplacer}`
      } else {
        return '{#}'
      }
    }
  }
}

function interpret(message: string, values: ICUCompilerValues): string {
  try {
    return compile(parse(lex(message)), values)
  } catch (e) {
    console.error(`Failed to interpret message: ${message}`, e)
    return message
  }
}

export const ICUUtil = {
  lex,
  parse,
  compile,
  interpret
}
