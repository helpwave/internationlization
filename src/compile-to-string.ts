import type { ICUASTNode } from '@/src/parse'

export function getPluralKey(num: number)  {
  return num === 0 ? '=0' :
      num === 1 ? '=1' :
        num === 2 ? '=2' :
          num > 2 && num < 5 ? 'few' :
            num >= 5 ? 'many' : 'other'
}

type CompilerContext = {
  hashtagReplacer?: number,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ICUCompilerValues = Record<string, any>

/**
 * Compiles a ICUASTNode tree to a string
 * @param node Tree to compile
 * @param values The values that replace the variable in the tree
 * @param context The context values of previous compile iterations
 */
export function compileToString(node: ICUASTNode, values: ICUCompilerValues, context: CompilerContext = {}): string {
  switch (node.type) {
    case 'Node': {
      return node.parts.map(p => compileToString(p, values, context)).join('')
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
          const pluralKey = getPluralKey(num)

          const chosen = node.options[pluralKey] ?? node.options['other']
          if (!chosen) {
            console.warn(`ICU Compile: plural for ${name} could not find key ${pluralKey} and no other`)
            return `{${name}}`
          }
          return compileToString(chosen, values, { ...context, hashtagReplacer: num })
        }
        case 'select': {
          if (val === undefined) {
            console.warn(`ICU Compile: missing value for select ${name}`)
            const other = node.options['other']
            return other ? compileToString(other, values, context) : `{${name}}`
          }
          const chosen = node.options[String(val)] ?? node.options['other']
          if (!chosen) {
            console.warn(`ICU Compile: select ${name} chose undefined option "${val}" and no "other" provided`)
            return `{${name}}`
          }
          return compileToString(chosen, values, context)
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