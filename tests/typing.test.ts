import type { Translation } from '../src'

type TestTranslation = {
  entry1: string,
  entry2: string,
  function1: (values: { name: string, author: string }) => string,
  function2: (values: { status: string }) => string,
}

// The type we want to validate
type T = Translation<'en' | 'de', TestTranslation>

// Runtime type guard for Jest
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isValidTranslation(obj: any): obj is T {
  const locales = ['en', 'de']
  return locales.every(locale => {
    const localeObj = obj[locale]
    return (
      localeObj &&
      typeof localeObj.entry1 === 'string' &&
      typeof localeObj.entry2 === 'string' &&
      typeof localeObj.function1 === 'function' &&
      typeof localeObj.function2 === 'function'
    )
  })
}

// Example translation object
const translationCandidate: T = {
  en: {
    entry1: 'Hello',
    entry2: 'World',
    function1: ({ name, author }) => `${name} by ${author}`,
    function2: ({ status }) => `Status: ${status}`,
  },
  de: {
    entry1: 'Hallo',
    entry2: 'Welt',
    function1: ({ name, author }) => `${name} von ${author}`,
    function2: ({ status }) => `Status: ${status}`,
  },
}

test('Typing and type shape', () => {
  expect(isValidTranslation(translationCandidate)).toBe(true)
})