import { ICUUtil } from '../src'
import { compileToCode } from '../src/compile-to-code'

type ExampleValues = {
  name: string,
  input: string,
  result: string[],
}

const examples: ExampleValues[] = [
  {
    name: 'Plural with number insertion',
    input: 'You have {count, plural, =1{# Cat} other{# Cats}}',
    result: [
      '`You have `',
      'TranslationGen.resolvePlural(count, {',
      "  '=1': `${count} Cat`,",
      "  'other': `${count} Cats`,",
      '})',
    ],
  },
  {
    name: 'Select with nested replacement',
    input: '{gender, select, male{Hello Mr.} female{Hello Ms.} other{Hello}} {name}',
    result: [
      'TranslationGen.resolveSelect(gender, {',
      "  'male': `Hello Mr.`,",
      "  'female': `Hello Ms.`,",
      "  'other': `Hello`,",
      '})',
      '` ${name}`'
    ],
  },
  {
    name: 'ICU Escape sequence',
    input: "'''''' '{}'",
    result: ["`''' {}`"],
  },
  {
    name: 'Template JS escape sequence',
    input: `\` '$\{}'`,
    // eslint-disable-next-line no-useless-escape
    result: ['`\\\` \\${}`'],
  }
]


describe('ICU Code-Compiler', () => {
  for (const example of examples) {
    test(`${example.name}`, () => {
      const result = compileToCode(ICUUtil.parse(ICUUtil.lex(example.input)))
      expect(result).toEqual(example.result)
    })
  }
})
