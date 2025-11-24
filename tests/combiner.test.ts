import { combineTranslation } from '../src'

type TestTranslation = {
  hello: string,
  goodbye: string,
  greet: (values: { name: string }) => string,
}

type Languages = 'en'|'de'

const enTranslation = {
  en: {
    hello: 'Hello',
    goodbye: 'Goodbye',
    greet: ({ name }: { name: string }) => `Hello, ${name}!`,
  },
}

const deTranslation = {
  de: {
    hello: 'Hallo',
    goodbye: 'Auf Wiedersehen',
    greet: ({ name }: { name: string }) => `Hallo, ${name}!`,
  },
}

describe('combineTranslation', () => {
  let originalWarn: typeof console.warn

  beforeAll(() => {
    // Save the original console.warn
    originalWarn = console.warn
  })

  afterAll(() => {
    // Restore it after tests
    console.warn = originalWarn
  })

  test('returns string translations correctly', () => {
    const t = combineTranslation(enTranslation, 'en')
    expect(t('hello')).toBe('Hello')
    expect(t('goodbye')).toBe('Goodbye')
  })

  test('returns function translations correctly', () => {
    const t = combineTranslation(enTranslation, 'en')
    expect(t('greet', { name: 'Alice' })).toBe('Hello, Alice!')
  })

  test('supports multiple translation objects', () => {
    const t = combineTranslation<Languages, TestTranslation>([enTranslation, deTranslation], 'de')
    expect(t('hello')).toBe('Hallo')
    expect(t('greet', { name: 'Bob' })).toBe('Hallo, Bob!')
  })

  test('falls back for missing keys', () => {
    console.warn = jest.fn()
    const t = combineTranslation([{ en: { hello: 'Hi' } }], 'en')
    expect(t('goodbye')).toBe('{{en:goodbye}}')

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Did not find key')
    )
  })

  test('falls back for missing locales', () => {
    console.warn = jest.fn()
    const t = combineTranslation<Languages, TestTranslation>([{ de: { hello: 'Hallo' } }], 'en')
    expect(t('hello')).toBe('{{en:hello}}')

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Did not find locale')
    )
  })
})
