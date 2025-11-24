// AUTO-GENERATED. DO NOT EDIT.
/* eslint-disable @stylistic/quote-props */
/* eslint-disable no-useless-escape */

import type { Translation } from 'src/index'
import { TranslationGen } from 'src/index'

export const exampleTranslationLocales = ['de-DE', 'en-US', 'fr-FR'] as const

export type ExampleTranslationLocales = typeof exampleTranslationLocales[number]

export type ExampleTranslationEntries = {
  'accountStatus': (values: { status: string }) => string,
  'ageCategory': (values: { ageGroup: string }) => string,
  'escapeCharacters': string,
  'escapedExample': string,
  'itemCount': (values: { count: number }) => string,
  'nestedSelectPlural': (values: { gender: string, count: number }) => string,
  'passwordStrength': (values: { strength: string }) => string,
  'priceInfo': (values: { price: number, currency: string }) => string,
  'taskDeadline': (values: { deadline: string }) => string,
  'userGreeting': (values: { gender: string, name: string }) => string,
  'welcomeMessage': (values: { gender: string, name: string, count: number }) => string,
  'goodbye': string,
  'hello': string,
  'thankYou': string,
  'welcome': string,
  'yes': string,
}

export const exampleTranslation: Translation<ExampleTranslationLocales, Partial<ExampleTranslationEntries>> = {
  'de-DE': {
    'accountStatus': ({ status }): string => {
      return TranslationGen.resolveSelect(status, {
        'active': `Aktiv`,
        'inactive': `Inaktiv`,
        'other': `Unbekannt`,
      })
    },
    'ageCategory': ({ ageGroup }): string => {
      return TranslationGen.resolveSelect(ageGroup, {
        'child': `Kind`,
        'adult': `Erwachsener`,
        'senior': `Senior`,
        'other': `Person`,
      })
    },
    'escapeCharacters': `Folgende Zeichen werden mit \\ im resultiernden string ergänzt \`, \\ und \$ \${`,
    'escapedExample': `Folgende Zeichen müssen escaped werden: {, }, '`,
    'itemCount': ({ count }): string => {
      return TranslationGen.resolveSelect(count, {
        '=0': `Keine Elemente`,
        '=1': `Ein Element`,
        'other': `${count} Elemente`,
      })
    },
    'nestedSelectPlural': ({ gender, count }): string => {
      return TranslationGen.resolveSelect(gender, {
        'male': TranslationGen.resolveSelect(count, {
          '=0': `Keine Nachrichten`,
          '=1': `Eine Nachricht`,
          'other': `${count} Nachrichten`,
        }),
        'female': TranslationGen.resolveSelect(count, {
          '=0': `Keine Nachrichten`,
          '=1': `Eine Nachricht`,
          'other': `${count} Nachrichten`,
        }),
        'other': TranslationGen.resolveSelect(count, {
          '=0': `Keine Nachrichten`,
          '=1': `Eine Nachricht`,
          'other': `${count} Nachrichten`,
        }),
      })
    },
    'passwordStrength': ({ strength }): string => {
      return TranslationGen.resolveSelect(strength, {
        'weak': `Schwach`,
        'medium': `Mittel`,
        'strong': `Stark`,
        'other': `Unbekannt`,
      })
    },
    'priceInfo': ({ price, currency }): string => {
      let _out: string = ''
      _out += `Der Preis beträgt ${price}`
      _out += TranslationGen.resolveSelect(currency, {
        'usd': `\$USD`,
        'eur': `€`,
      })
      _out += `.`
      return _out
    },
    'taskDeadline': ({ deadline }): string => {
      return `Die Aufgabe muss bis ${deadline} erledigt sein.`
    },
    'userGreeting': ({ gender, name }): string => {
      return TranslationGen.resolveSelect(gender, {
        'male': `Hallo, ${name}!`,
        'female': `Hallo, ${name}!`,
        'other': `Hallo, Person!`,
      })
    },
    'welcomeMessage': ({ gender, name, count }): string => {
      let _out: string = ''
      _out += TranslationGen.resolveSelect(gender, {
        'male': `Willkommen, ${name}!`,
        'female': `Willkommen, ${name}!`,
        'other': `Willkommen, Person!`,
      })
      _out += ` Du hast `
      _out += TranslationGen.resolveSelect(count, {
        '=0': `keine neuen Nachrichten`,
        '=1': `eine neue Nachricht`,
        'other': `${count} neue Nachrichten`,
      })
      _out += `.`
      return _out
    }
  },
  'en-US': {
    'accountStatus': ({ status }): string => {
      return TranslationGen.resolveSelect(status, {
        'active': `Active`,
        'inactive': `Inactive`,
        'other': `Unknown`,
      })
    },
    'ageCategory': ({ ageGroup }): string => {
      return TranslationGen.resolveSelect(ageGroup, {
        'child': `Child`,
        'adult': `Adult`,
        'senior': `Senior`,
        'other': `Person`,
      })
    },
    'escapedExample': `The following characters must be escaped: { } '`,
    'itemCount': ({ count }): string => {
      return TranslationGen.resolveSelect(count, {
        '=0': `No items`,
        '=1': `One item`,
        'other': `${count} items`,
      })
    },
    'nestedSelectPlural': ({ gender, count }): string => {
      return TranslationGen.resolveSelect(gender, {
        'male': TranslationGen.resolveSelect(count, {
          '=0': `No messages`,
          '=1': `One message`,
          'other': `${count} messages`,
        }),
        'female': TranslationGen.resolveSelect(count, {
          '=0': `No messages`,
          '=1': `One message`,
          'other': `${count} messages`,
        }),
        'other': TranslationGen.resolveSelect(count, {
          '=0': `No messages`,
          '=1': `One message`,
          'other': `${count} messages`,
        }),
      })
    },
    'passwordStrength': ({ strength }): string => {
      return TranslationGen.resolveSelect(strength, {
        'weak': `Weak`,
        'medium': `Medium`,
        'strong': `Strong`,
        'other': `Unknown`,
      })
    },
    'priceInfo': ({ price, currency }): string => {
      let _out: string = ''
      _out += `The price is ${price}`
      _out += TranslationGen.resolveSelect(currency, {
        'usd': `\$USD`,
        'eur': `€`,
      })
      _out += `.`
      return _out
    },
    'taskDeadline': ({ deadline }): string => {
      return `The task must be completed by ${deadline}.`
    },
    'userGreeting': ({ gender, name }): string => {
      return TranslationGen.resolveSelect(gender, {
        'male': `Hello, ${name}!`,
        'female': `Hello, ${name}!`,
        'other': `Hello, person!`,
      })
    },
    'welcomeMessage': ({ gender, name, count }): string => {
      let _out: string = ''
      _out += TranslationGen.resolveSelect(gender, {
        'male': `Welcome, ${name}!`,
        'female': `Welcome, ${name}!`,
        'other': `Welcome, person!`,
      })
      _out += ` You have `
      _out += TranslationGen.resolveSelect(count, {
        '=0': `no new messages`,
        '=1': `one new message`,
        'other': `${count} new messages`,
      })
      _out += `.`
      return _out
    }
  },
  'fr-FR': {
    'goodbye': `Au revoir`,
    'hello': `Bonjour`,
    'thankYou': `Merci`,
    'welcome': `Bienvenue`,
    'yes': `Oui`
  }
}
