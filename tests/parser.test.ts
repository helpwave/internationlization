import type { ICUASTNode, ICUToken } from '../src'
import { ICUUtil } from '../src'

type ExampleValues = {
  name: string,
  input: ICUToken[],
  result: ICUASTNode,
}

const examples: ExampleValues[] = [
  {
    name: 'Simple Replace',
    input: [
      { type: 'TEXT', value: 'Hello' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'name' },
      { type: 'RBRACE' }
    ],
    result: {
      type: 'Node',
      parts: [
        { type: 'Text', value: 'Hello ' },
        { type: 'SimpleReplace', variableName: 'name' }
      ]
    },
  },
  {
    name: 'Plural with number insertion',
    input: [
      { type: 'TEXT', value: 'You' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'have' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'count' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'plural' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: '=1' },
      { type: 'LBRACE' },
      { type: 'HASHTAG' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'apple' },
      { type: 'RBRACE' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'other' },
      { type: 'LBRACE' },
      { type: 'HASHTAG' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'apples' },
      { type: 'RBRACE' },
      { type: 'RBRACE' }
    ],
    result: {
      type: 'Node',
      parts: [
        { type: 'Text', value: 'You have ' },
        {
          type: 'OptionReplace',
          operatorName: 'plural',
          variableName: 'count',
          options: {
            '=1': {
              type: 'Node',
              parts: [
                { type: 'NumberField' },
                { type: 'Text', value: ' apple' }
              ]
            },
            'other': {
              type: 'Node',
              parts: [
                { type: 'NumberField' },
                { type: 'Text', value: ' apples' }
              ]
            }
          }
        }
      ]
    },
  },
  {
    name: 'Select with nested replacement',
    input: [
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'gender' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'select' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'male' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'Hello' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'Mr.' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'name' },
      { type: 'RBRACE' },
      { type: 'RBRACE' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'female' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'Hello' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'Ms.' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'name' },
      { type: 'RBRACE' },
      { type: 'RBRACE' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'other' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'Hello' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'name' },
      { type: 'RBRACE' },
      { type: 'RBRACE' },
      { type: 'RBRACE' }
    ],
    result: {
      type: 'OptionReplace',
      operatorName: 'select',
      variableName: 'gender',
      options: {
        male: {
          type: 'Node',
          parts: [
            { type: 'Text', value: 'Hello Mr. ' },
            { type: 'SimpleReplace', variableName: 'name' }
          ]
        },
        female: {
          type: 'Node',
          parts: [
            { type: 'Text', value: 'Hello Ms. ' },
            { type: 'SimpleReplace', variableName: 'name' }
          ]
        },
        other: {
          type: 'Node',
          parts: [
            { type: 'Text', value: 'Hello ' },
            { type: 'SimpleReplace', variableName: 'name' }
          ]
        }
      }
    },
  },
  {
    name: 'Plural and Select in succession',
    input: [
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'count' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'plural' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: '=0' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'no' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'items' },
      { type: 'RBRACE' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: '=1' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'one' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'item' },
      { type: 'RBRACE' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'other' },
      { type: 'LBRACE' },
      { type: 'HASHTAG' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'items' },
      { type: 'RBRACE' },
      { type: 'RBRACE' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'and' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'gender' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'select' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'male' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'sir' },
      { type: 'RBRACE' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'other' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'friend' },
      { type: 'RBRACE' },
      { type: 'RBRACE' }
    ],
    result: {
      type: 'Node',
      parts: [
        {
          type: 'OptionReplace',
          operatorName: 'plural',
          variableName: 'count',
          options: {
            '=0': { type: 'Text', value: 'no items' },
            '=1': { type: 'Text', value: 'one item' },
            'other': {
              type: 'Node', parts: [
                { type: 'NumberField' },
                { type: 'Text', value: ' items' }
              ]
            }
          }
        },
        { type: 'Text', value: ' and ' },
        {
          type: 'OptionReplace',
          operatorName: 'select',
          variableName: 'gender',
          options: {
            male: { type: 'Text', value: 'sir' },
            other: { type: 'Text', value: 'friend' }
          }
        }
      ]
    },
  },
  {
    name: 'Plural nested in Select',
    input: [
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'userType' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'select' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'admin' },
      { type: 'LBRACE' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'count' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'plural' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: '=1' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'Admin' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: '1' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'message' },
      { type: 'RBRACE' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'other' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'Admin' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'HASHTAG' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'messages' },
      { type: 'RBRACE' },
      { type: 'RBRACE' },
      { type: 'RBRACE' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'member' },
      { type: 'LBRACE' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'count' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'plural' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: '=1' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'Member' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: '1' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'message' },
      { type: 'RBRACE' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'other' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'Member' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'HASHTAG' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'messages' },
      { type: 'RBRACE' },
      { type: 'RBRACE' },
      { type: 'RBRACE' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'other' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'Guest' },
      { type: 'RBRACE' },
      { type: 'RBRACE' }
    ],
    result: {
      type: 'OptionReplace',
      operatorName: 'select',
      variableName: 'userType',
      options: {
        admin: {
          type: 'OptionReplace',
          operatorName: 'plural',
          variableName: 'count',
          options: {
            '=1': { type: 'Text', value: 'Admin, 1 message' },
            'other': {
              type: 'Node',
              parts: [
                { type: 'Text', value: 'Admin, ' },
                { type: 'NumberField' },
                { type: 'Text', value: ' messages' }
              ]
            }
          }
        },
        member: {
          type: 'OptionReplace',
          operatorName: 'plural',
          variableName: 'count',
          options: {
            '=1': { type: 'Text', value: 'Member, 1 message' },
            'other': {
              type: 'Node',
              parts: [
                { type: 'Text', value: 'Member, ' },
                { type: 'NumberField' },
                { type: 'Text', value: ' messages' }
              ]
            }
          }
        },
        other: { type: 'Text', value: 'Guest' }
      }
    },
  },
  {
    name: 'Replace, Escape and Plural',
    input: [
      { type: 'TEXT', value: 'Today' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'is' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'ESCAPE' },
      { type: 'LBRACE' },
      { type: 'ESCAPE' },
      { type: 'TEXT', value: 'special' },
      { type: 'ESCAPE' },
      { type: 'RBRACE' },
      { type: 'ESCAPE' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'and' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'you' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'have' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'LBRACE' },
      { type: 'TEXT', value: 'count' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'plural' },
      { type: 'COMMA' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: '=1' },
      { type: 'LBRACE' },
      { type: 'HASHTAG' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'cat' },
      { type: 'RBRACE' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'other' },
      { type: 'LBRACE' },
      { type: 'HASHTAG' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'TEXT', value: 'cats' },
      { type: 'RBRACE' },
      { type: 'RBRACE' }
    ],
    result: {
      type: 'Node',
      parts: [
        { type: 'Text', value: 'Today is {special} and you have ' },
        {
          type: 'OptionReplace',
          operatorName: 'plural',
          variableName: 'count',
          options: {
            '=1': {
              type: 'Node',
              parts: [
                { type: 'NumberField' },
                { type: 'Text', value: ' cat' }
              ]
            },
            'other': {
              type: 'Node',
              parts: [
                { type: 'NumberField' },
                { type: 'Text', value: ' cats' }
              ]
            }
          }
        }
      ]
    },
  },
  {
    name: 'Escape sequence',
    input: [
      { type: 'ESCAPE' },
      { type: 'ESCAPE' },
      { type: 'ESCAPE' },
      { type: 'ESCAPE' },
      { type: 'ESCAPE' },
      { type: 'ESCAPE' },
      { type: 'WHITESPACE', value: ' ' },
      { type: 'ESCAPE' },
      { type: 'LBRACE' },
      { type: 'RBRACE' },
      { type: 'ESCAPE' },
    ],
    result: {
      type: 'Text',
      value: "''' {}",
    },
  }
]

describe('ICU Parser', () => {
  for (const example of examples) {
    test(`${example.name}:`, () => {
      const result = ICUUtil.parse(example.input)
      expect(result).toEqual(example.result)
    })
  }
})
