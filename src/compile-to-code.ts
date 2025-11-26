import type { ICUASTNode } from './parse'

function escapeForTemplateJS(s: string): string {
  return s
    .replace(/\\/g, `\\\\`)
    .replace(/`/g, `\\\``)
    .replace(/\$/g, `\\$`)
}

type CompileContextResult = {
  numberParam?: string,
  inNode: boolean,
  indentLevel: number,
  isOnlyText: boolean,
}

type CompileContext = Partial<CompileContextResult>

const defaultCompileContext: CompileContextResult = {
  indentLevel: 0,
  inNode: false,
  isOnlyText: false,
}

export function compileToCode(
  node: ICUASTNode,
  initialContext?: CompileContext
): string[] {
  const context: CompileContextResult = { ...defaultCompileContext, ...initialContext }
  const lines: string[] = []
  let currentLine = ''

  function indent(level: number = context.indentLevel) {
    return ' '.repeat(level * 2)
  }

  function flushCurrent() {
    if (currentLine) {
      if (context.inNode) {
        lines.push(currentLine)
      } else {
        const nextLine = `${indent()}\`${currentLine}\``
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
        const compiled = compileToCode(partNode, { ...context, inNode: true })
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
      const resolver = node.operatorName === 'plural' ?
        'TranslationGen.resolvePlural': 'TranslationGen.resolveSelect'
      lines.push(`${resolver}(${node.variableName}, {`)

      const entries = Object.entries(node.options)

      for (const [key, entryNode] of entries) {
        const expr = compileToCode(entryNode, {
          ...context,
          numberParam:  node.operatorName === 'plural' ? node.variableName : context.numberParam,
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